let queues = {};
let winston = require('winston');

function Queue(limit) {
    this.queues = new Array(limit).fill(1).map((_, idx) => idx);
    this.dispatcher = 0;
    this.tasks = 0;
}

Queue.prototype.run = function (task) {
    let self = this;
    self.tasks++;
    winston.silly((task.name || task) + " added. Pending tasks: " + self.tasks);
    return new Promise((resolve, reject) => {
        self.dispatcher = Promise.resolve(self.dispatcher)
            .then(function () {
                return new Promise(function (resolve_dispatcher) {
                    return Promise.race(self.queues)
                        .then(function (queue) {
                            self.queues[queue] = Promise.resolve(self.queues[queue])
                                .then(function () {
                                    return task();
                                })
                                .catch(err => {
                                    winston.error((task.name || task) + " failed on queue " + queue + ". Error: ", err);
                                    reject(err);
                                })
                                .then(result => {
                                    self.tasks--;
                                    winston.info((task.name || task) + " completed on queue " + queue + ". Pending tasks: " + self.tasks);
                                    resolve(result);
                                    return queue;
                                });
                            resolve_dispatcher();
                        })
                });
            })
    });
};

module.exports = function(name, limit) {
    if (typeof limit === "undefined") {
        if (typeof name === "number") {
            limit = name;
            name = '';
        }
        else if (typeof name === "undefined") name = '';
        if (typeof name !== "string") throw "Incorrect parameters";
    }
    else limit = +limit;

    name = name + '';
    if (!queues.hasOwnProperty(name)) {
        if (isNaN(limit) || limit < 1) throw "Incorrect parameters";
        queues[name] = new Queue(limit);
    }
    return queues[name];
};