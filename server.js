const http = require('http');

http.createServer((request, response) => {
    let body = [];
    request.on('error', (err) => {
        console.log(err)
    }).on('data', (chunk) => {
        // console.log('chunk', Buffer.from(chunk).toString())
        // body.push(chunk.toString())
        body.push(chunk)
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        console.log('body:', body);
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(`<html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Document</title>
            <style>
                body #box img {
                    height: 300px;
                }
                body #box .pic {
                    height: 200px;
                    width: 200px;
                    border: 1px solid red;
                }
            </style>
        </head>
        <body>
            <div id="box">
                <img class="pic" src="" alt="" />
                <img src="" alt="" />
            </div>
        </body>
        </html>`)
    })
}).listen(8088)
console.log('server started')