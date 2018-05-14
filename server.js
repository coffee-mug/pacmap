const fs = require('fs'),
      http = require('http'),
      url = require('url');

const port = process.argv[2] || 8000;

const server = http.createServer( (req, res) => {
  let stream,
      patternForStatic = new RegExp(/\/(\w+\.(?:css|js))/),
      filename = '';

  switch(true) {
    case patternForStatic.test(req.url):
      filename = patternForStatic.exec(req.url)[1];
      stream = fs.createReadStream(__dirname + "/client/" + filename);
      break;
    default:
      stream = fs.createReadStream(__dirname + "/index.html");
      break;
  }

  stream.pipe(res);
});

server.listen(Number(port));
