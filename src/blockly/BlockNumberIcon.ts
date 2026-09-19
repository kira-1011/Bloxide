import * as Blockly from "blockly/core";

const SIZE = 18;

/**
 * The number a block is referred to by, drawn on the block itself.
 *
 * An Icon rather than an SVG layer of our own: Blockly positions it, moves it
 * with the block, and disposes it with the block, so nothing has to be kept in
 * sync through drags, zoom or scroll.
 */
export class BlockNumberIcon extends Blockly.icons.Icon {
  static readonly TYPE = new Blockly.icons.IconType<BlockNumberIcon>("bloxide_number");

  private label: SVGTextElement | null = null;
  private value = 0;

  override getType(): Blockly.icons.IconType<BlockNumberIcon> {
    return BlockNumberIcon.TYPE;
  }

  override getSize(): Blockly.utils.Size {
    return new Blockly.utils.Size(SIZE, SIZE);
  }

  /** Before the mutator and warning icons, so numbers line up down the stack. */
  override getWeight(): number {
    return -1;
  }

  override initView(pointerdownListener: (e: PointerEvent) => void): void {
    if (this.svgRoot) return;
    super.initView(pointerdownListener);
    if (!this.svgRoot) return;

    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.CIRCLE,
      { class: "bloxideNumberBadge", r: SIZE / 2, cx: SIZE / 2, cy: SIZE / 2 },
      this.svgRoot,
    );
    this.label = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.TEXT,
      {
        class: "bloxideNumberText",
        x: SIZE / 2,
        y: SIZE / 2,
        "text-anchor": "middle",
        "dominant-baseline": "central",
      },
      this.svgRoot,
    );
    this.label.textContent = String(this.value);
  }

  setNumber(value: number): void {
    this.value = value;
    if (this.label) this.label.textContent = String(value);
  }

  getNumber(): number {
    return this.value;
  }
}
