const Koa = require('koa');
const logger = require('koa-logger');
const Router = require('koa-router');
const serve = require('koa-static');
const path = require('path');
const fs = require('fs');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

// 使用 koa-logger 中间件
app.use(logger());
app.use(bodyParser());

// 静态文件服务
app.use(serve(path.join(__dirname, 'assets')));

// 新增静态文件服务，处理以 .mjs, .cjs, .js 为后缀的请求
app.use(serve(path.join(__dirname, 'scripts'), {
    extensions: ['mjs', 'cjs', 'js']
}));

router.get('/', async (ctx) => {
    ctx.redirect('/Dashboard/');
});

router.get('/Login/', async (ctx) => {
    ctx.type = 'html';
    ctx.body = require('fs').createReadStream(path.join(__dirname, 'pages/login.html'));
});

router.get('/Dashboard/', async (ctx) => {
    ctx.type = 'html';
    ctx.body = require('fs').createReadStream(path.join(__dirname, 'pages/dashboard.html'));
});

router.get('/Monitor/', async (ctx) => {
    ctx.type = 'html';
    ctx.body = require('fs').createReadStream(path.join(__dirname, 'pages/monitor.html'));
});

// 使用路由中间件
app
    .use(router.routes())
    .use(router.allowedMethods());

// 启动服务器
const PORT = 80;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
