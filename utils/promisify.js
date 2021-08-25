export default function promisify(fun) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            function callback(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            }

            args.push(callback);

            fun.call(this, ...args);
        });
    };
}