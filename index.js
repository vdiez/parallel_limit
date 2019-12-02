let winston = require('winston');

function Queue(limit) {
    this.slots = new Array(limit).fill(1).map((_, idx) => idx);
    this.dispatcher = 0;
    this.counter = 0;
}

Queue.prototype = {
    run(task) {
        this.counter++;
        winston.silly((task.name || task) + " added. Pending tasks: " + this.counter);
        return new Promise((resolve, reject) => {
            this.dispatcher = Promise.resolve(this.dispatcher)
                .then(() => new Promise(resolve_dispatcher => Promise.race(this.slots)
                    .then(slot => {
                        this.slots[slot] = Promise.resolve(this.slots[slot])
                            .then(() => task())
                            .catch(err => {
                                winston.error((task.name || task) + " failed on slot " + slot + ". Error: ", err);
                                reject(err);
                            })
                            .then(result => {
                                this.counter--;
                                winston.silly((task.name || task) + " completed on slot " + slot + ". Pending tasks: " + this.counter);
                                resolve(result);
                                return slot;
                            });
                        resolve_dispatcher();
                    })))
        });
    },
    size() {
        return this.slots.length;
    },
    set_size(limit) {
        for (let i = this.slots.length; i < limit; i++) this.slots.push(i);//if limit has been increased
        while (this.slots.length > limit) this.slots.pop();//if limit has been reduced
    }
};

let queues = {};
module.exports = (name, limit) => {
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
    else if (!isNaN(limit) && limit != queues[name].size()) queues[name].set_size(limit);
    return queues[name];
};