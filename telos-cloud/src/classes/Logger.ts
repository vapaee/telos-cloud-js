/*
English: Logger is a class that can be instantiated with a namespace (usually the name of the file or class that uses it).
```ts
import Logger from './Logger';
const logger = new Logger('MyClass');

class MyClass {
    constructor(public a:string, public b:number, public service: Service) {
        const trace = logger.method("constructor", a, b);
    }

    foo() {
        const trace = logger.method("foo");
        trace("Hello!");
        this.show('This is a very long message that will be truncated');
        this.service.fetchData(this.a, this.b).then(data => {
            trace('fetchData returned:', data);
            // do something with data
        });
    }

    bar(n: number) {
        const trace = logger.method('bar', n);
        trace('n:' n);
        this.foo();
        trace('bar done');
    }

    show(m: string) {
        const trace = logger.method('show', m);
        trace('m:', m);
    }
}

const myClass = new MyClass('hello', 42, new Service());
myClass.bar(5);
```
The output of the above code would be something like:
```
MyClass.constructor("hello", 42)
MyClass.bar(5)
MyClass.bar(5) n: 5
MyClass.foo()
MyClass.foo() Hello!
MyClass.show("This is a...")
MyClass.show("This is a...") m: This is a very long message that will be truncated
MyClass.bar() bar done
MyClass.foo() fetchData returned: { ... }
```
*/

export class Logger {
    private namespace: string;
    private enabled: boolean = false;

    constructor(namespace: string) {
        this.namespace = namespace;
    }

    public enable() {
        this.enabled = true;
    }

    method(method: string, ...args: any[]): (...args: any[]) => void {
        if (!this.enabled) {
            return () => {};
        }
        const processedArgs = args.map(arg => {
            const max = 10;
            if (typeof arg === 'string' && arg.length > max) {
                return arg.substring(0, max) + '...';
            }
            if (!Array.isArray(arg) && arg !== null && typeof arg === 'object') {
                try {
                    return JSON.stringify(arg).substring(0, max) + '...';
                } catch (e) {
                    return arg;
                }
            }
            return arg;
        });
        const scope = `${this.namespace}.${method}(${processedArgs})`;
        console.log(scope, args);
        const tracer = (...args: any[]) => {
            console.log(scope, ...args);
        }
        return tracer;
    }
}