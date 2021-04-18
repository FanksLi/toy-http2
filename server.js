const http = require('http');

http.createServer((request, response) => {
    let body = [];
    request.on('error', (err) => {
        console.log(err)
    }).on('data', (chunk) => {
        console.log('chunk', Buffer.from(chunk).toString())
        body.push(chunk.toString())
    }).on('end', () => {
        console.log('body:', body);
        // body = Buffer.concat(body).toString();
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(' Helloo World\n')
    })
}).listen(8088)
console.log('server started')