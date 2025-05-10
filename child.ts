import * as t from "three";

abstract class Child {
  async apply(_scene: t.Scene): Promise<void> {}
  async destroy(_scene: t.Scene): Promise<void> {}
  async render(_scene: t.Scene): Promise<void> {}
}

export default Child;
