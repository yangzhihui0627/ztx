const EventEmitter = require('events').EventEmitter;
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const Schedule = require('./schedule');
const Downloader = require('./downloader');
const Constant = require('./constant');


class ZtxEngine extends EventEmitter {
    constructor() {
        super();

        this.spiders = [];
        this.itemProcessMiddlewares = [];

        this.init();
    }

    use(middleware, middlewareType = Constant.ITEMPROCESSMIDDLEWARE) {
        this.itemProcessMiddlewares.push(middleware);
    }

    /**
     * 初始化
     */
    init() {
        let schedule = new Schedule(this),
            downloader = new Downloader(this);

        //ctx 中包含value  和 spider
        this.on('item:process', (ctx) => {
            let middlewares = this.itemProcessMiddlewares,
                index = 0;

            (function next() {
                let handler = middlewares[index++];
                if (!handler) return;
                handler(ctx, next);
            })();

        });

    }
    start(options = {}) {
        let spiderPath;
        let defaultPath = path.resolve(__dirname, '../../../spiders');
        if (fs.existsSync(defaultPath)) {
            spiderPath = defaultPath;
        }
        if (options.spiderPath) {
            spiderPath = options.spiderPath;
        }

        let files = fs.readdirSync(spiderPath);

        for (let file of files) {
            let SpiderClass = require(path.join(spiderPath, file));
            let instance = new SpiderClass();
            //name 不能重复，需要基于name 设置event
            if (_.some(this.spiders, {
                    name: instance.name
                })) {
                console.error(`multi spiders have same name ${instance.name}`);
                console.error(instance)
                return;
            }

            instance.setEngine(this);

            this.spiders.push({
                ...instance
            });
        }

        //开始调度
        this.spiders.forEach(v => {

            this.emit('schedule.start', {
                url: v.start_urls,
                name: v.name
            })

        })

    }
}

if (require.main.filename === __filename) {
    let ztx = new ZtxEngine();

    ztx.start();
}

module.exports = ZtxEngine