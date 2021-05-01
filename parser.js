
const css = require('css');


let currentToken = null;
let currentAttribute = null;
let stack = [{type: "document", children: []}]
let currentTextNode = null
let rules = [];

function specificity (selector) {
    let p = [0, 0, 0, 0];
    const selectorParts = selector.split(' ');
    for (let part of selectorParts) {
        if (part.charAt(0) === '#') {
            p[1] += 1;
        } else if (part.charAt(0) === '.') {
            p[2] += 1;
        } else {
            p[3] += 1;
        }
    }
    return p
}

function compare (sp1, sp2) {
    if (sp1[0] - sp2[0]) {
        return sp1[0] - sp2[0];
    } else if (sp1[1] - sp2[1]) {
        return sp1[1] - sp2[1];
    } else if (sp1[2] - sp2[2]) {
        return sp1[2] - sp2[2]
    }
    return sp1[3] - sp2[3]
}

function match (element, selector) {
    if (!selector || !element.attributes) {
        return false
    }

    if (selector.charAt(0) === '#') {
        const attr = element.attributes.filter(attr => attr.name === 'id')[0];
        if (attr && attr.value === selector.replace('#', '')) {
            return true
        }
    } else if (selector.charAt(0) === '.') {
        const attr = element.attributes.filter(attr => attr.name === 'class')[0];
        if (attr && attr.value === selector.replace('.', '')) {
            return true
        }
    } else {
        if (element.tagName === selector) {
            return true
        }
    }

    return false
}

function addCSSRules (text) {
    var ast = css.parse(text)
    console.log(JSON.stringify(ast, null, "   "))
    rules.push(...ast.stylesheet.rules)
}

function computeCSS (element) {
    const elements = stack.slice().reverse()
    if (!element.computedStyle) {
        element.computedStyle = {};
    }

    for (let rule of rules) {
        const selectorParts  = rule.selectors[0].split(' ').reverse();

        if (!match(element, selectorParts[0])) {
            continue;
        }

        let matched = false
        
        let j = 1;
        for (let i = 0; i < elements.length; i++) {
            if (match(elements[i], selectorParts[j])) {
                j++;
            }
        }

        if (j >= selectorParts.length) {
            matched = true;
        }

        if (matched) {
            const sp = specificity(rule.selectors[0])
            let computedStyle = element.computedStyle;
            for (let declaration of rule.declarations) {
                if (!computedStyle[declaration.property]) {
                    computedStyle[declaration.property]= {};
                }
                if (!computedStyle[declaration.property].specificity) {
                    computedStyle[declaration.property].value = declaration.value
                    computedStyle[declaration.property].specificity = sp
                } else if (compare(computedStyle[declaration.property].specificity, sp) > 0) {
                    computedStyle[declaration.property].value = declaration.value
                    computedStyle[declaration.property].specificity = sp
                }
            }
            console.log('element', element, 'match rule', rule)
        }

    }
    // console.log(elements)
}

function emit(token) {
    let top = stack[stack.length-1];
    if (token.type === 'startTag') {
        let element = {
            type: 'element',
            children: [],
            attributes: []
        };
        element.tagName = token.tagName;

        for(let p in token) {
            if (p != 'type' && p != 'tagName') {
                element.attributes.push({
                    name: p,
                    value: token[p]
                })
            }
        }

        computeCSS(element)

        top.children.push(element)
        element.parent = top
        if (!token.isSelfclosing) {
            stack.push(element)
        }
        currentTextNode = null
    } else if (token.type === 'endTag')  {
        if (top.tagName != token.tagName) {
             throw new Error("Tag start end doesn't match!")
        } else {
            if (top.tagName === 'style') {
                addCSSRules(top.children[0].content)
            }
            stack.pop()
        }
        currentTextNode = null
    } else if (token.type === 'text') {
        if (currentTextNode === null) {
            currentTextNode = {
                type: 'text',
                content: ''
            }
            top.children.push(currentTextNode)
        }
        currentTextNode.content += token.content
    }
}
const EOF = Symbol('EOF');

function data(c) {
    if (c === '<') {
        return tagOpen
    } else if (c === EOF) {
        emit({
            type: 'EOF'
        })
        return ;
    } else {
        emit({
            type: 'text', 
            content: c
        })
        return data;
    }
}
function tagOpen(c) {
    if (c === '/') {
        return endTagOpen;
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'startTag',
            tagName: ''
        }
        return tagName(c)
    } else {
        return ;
    }
}
function endTagOpen(c) {
    if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: ''
        }
        return tagName(c)
    } else if (c === '>') {
        return ;
    } else if (c === EOF) {
        emit({
            type: 'EOF'
        })
        return ;
    } else {

    }
}
function tagName (c) {
    if (c.match(/^[\n\t\f ]$/)) {
        return beforeAttributeName;
    } else if (c === '>') {
        emit(currentToken)
        return data;
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken.tagName += c
        return tagName;
    } else if (c === '/') {
        return selfClosingStartTag;
    } else {
        return tagName;
    }
}
function beforeAttributeName (c) {
    if (c.match(/^[\n\t\f ]$/)) {
        return beforeAttributeName;
    } else if (c === '/' || c === '>' || c === EOF) {
        return affterAttributeName(c);
    } else if (c === '=') {
        return  ;
    } else {
        currentAttribute = {
            name: '',
            value: ''
        }
        return  attributeName(c);
    }
}
function attributeName (c) {
    if (c.match(/^[\t\n\f ]$/ || c === '/' || c === '>' || c === EOF)) {
        return affterAttributeName(c);
    } else if (c === '=') {
        return beforeAttributeValue;
    } else if (c === '\u0000') {

    } else if (c === '\"' || c === "'" || c === '<') {

    } else {
        currentAttribute.name += c;
        return attributeName;
    }
}
function beforeAttributeValue (c) {
    if (c.match(/^[\t\n\f ]$/) || c === "/" || c === '>' || c === EOF) {
        return beforeAttributeValue;
    } else if (c === '\"') {
        return doubleQuotedAttrbuteValue;
    } else if (c ='\'') {
        return singleQuotedAttrbuteValue;
    } else if (c === '>') {

    } else {
        return UnquotedAttrbuteValue(c)
    }
}
function doubleQuotedAttrbuteValue (c) {
    if (c === '\"') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return affterQuotedAttrbuteValue;
    } else if (c === '\u0000') {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttrbuteValue;
    }
}
function singleQuotedAttrbuteValue (c) {
    if (c === '\'') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return affterQuotedAttrbuteValue;
    } else if (c === '\u0000') {

    } else if (c === BOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttrbuteValue;
    }
}
function affterQuotedAttrbuteValue (c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c === '/') {
        return selfClosingStartTag;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data
    } else if (c === BOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttrbuteValue;
    }
}
function UnquotedAttrbuteValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return beforeAttributeName;
    } else if (c === '/') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToke);
        return data;
    } else if (c === '\u0000') {

    } else if (c === '\"' || c === "'" || c === '<' || c === '=' || c === "`") {

    } else if (c === BOF) {

    } else {
        currentAttribute.value += c;
        return UnquotedAttrbuteValue;
    }
}
function affterAttributeName (c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return affterAttributeName;
    } else if (c === '/') {
        return selfClosingStartTag;
    } else if (c === '=') {
        return beforeAttributeValue;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToke);
        return data;
    } else if (c === BOF) {

    } else {
        currentToken[currentAttribute.name] = currentAttribute.value;
        currentAttribute = {
            name: '',
            value: ''
        }
        return attributeName(c);
    }
}
function selfClosingStartTag (c) {
    if (c === '>') {
        currentToken.isSelfclosing = true
        return tagName(c);
    } else if (c === EOF) {

    } else {
        return data
    }
}
module.exports.parserHtml = function parserHtml(html) {
    let state = data;
    for(let c of html) {
        state = state(c)
    }
    state = state(EOF)
    // console.log(stack[0])
    return stack[0]
}