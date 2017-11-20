let queues = {};
let winston = require('winston');

function Queue(limit) {
    this.queues = new Array(limit).fill(1).map((_, idx) => idx);
    this.arbiter = 0;
}

Queue.prototype.run = function (task) {
    let self = this;
    self.arbiter = Promise.resolve(self.arbiter)
        .then(function () {
            return new Promise(function (resolve, reject) {
                return Promise.race(self.queues)
                    .then(function (queue) {
                        self.queues[queue] = Promise.resolve(self.queues[queue])
                            .then(function () {
                                return task();
                            })
                            .catch(err => {
                                winston.error((task.name || task) + " failed on queue " + queue + ". Error: ", err);
                            })
                            .then(function () {
                                winston.info((task.name || task) + " completed on queue " + queue);
                                return queue;
                            });
                        resolve();
                    })
            });
        })
};

module.exports = function(name, limit) {
    if (typeof name === "number") {
        limit = name;
        name = '';
    }

    if (typeof name === "string" && typeof limit === "number") {
        if (!queues.hasOwnProperty(name)) queues[name] = new Queue(limit);
        return queues[name];
    }
    else throw "Incorrect parameters";
};