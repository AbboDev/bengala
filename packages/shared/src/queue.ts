export class Queue<T = unknown> {
  private data: T[];

  constructor() {
    this.data = [];
  }

  add(record: T): void {
    this.data.unshift(record);
  }

  remove(): T | undefined {
    return this.data.pop();
  }

  first(): T | undefined {
    return this.data[0];
  }

  last(): T | undefined {
    return this.data[this.data.length - 1];
  }

  size(): number {
    return this.data.length;
  }
}

export default Queue;
