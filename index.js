function Queue(limit) {
    this.slots = new Array(limit).fill(1).map((_, idx) => Promise.resolve(idx));
    this.dispatcher = Promise.resolve();
    this.resolve_empty = () => {};
    this.counter = 0;
}

Queue.prototype = {
    run(task) {
        this.counter++;
        return new Promise((resolve, reject) => {
            this.dispatcher = this.dispatcher
                .then(() => new Promise(resolve_dispatcher => Promise.race(this.slots)
                    .then(slot => {
                        this.slots[slot] = this.slots[slot]
                            .then(() => task())
                            .catch(err => reject(err))
                            .then(result => {
                                this.counter--;
                                if (this.counter === 0) this.resolve_empty();
                                resolve(result);
                                return slot;
                            });
                        resolve_dispatcher();
                    })))
        });
    },
    done() {
        return new Promise(resolve => {
            if (this.counter === 0) resolve();
            else this.resolve_empty = resolve;
        })
    },
    size() {
        return this.slots.length;
    },
    set_size(limit) {
        if (limit === this.slots.length) return;
        for (let i = this.slots.length; i < limit; i++) this.slots.push(Promise.resolve(i)); //limit increased
        while (this.slots.length > limit) this.slots.pop().catch(() => {});                  //limit reduced
    }
};

let queues = {};
module.exports = (name, limit) => {
    if (typeof limit === "undefined") {
        if (typeof name === "number") {
            limit = name;
            name = undefined;
        }
    }

    if (typeof name === "string") {
        if (!queues.hasOwnProperty(name)) {
            if (typeof limit !== "number" || limit < 1) throw "Incorrect limit";
            queues[name] = new Queue(limit);
        }
        else if (typeof limit === "number" && limit > 0 && limit !== queues[name].size()) queues[name].set_size(limit);
        return queues[name];
    }
    if (typeof limit !== "number" || limit < 1) throw "Incorrect limit";
    return new Queue(limit);
};