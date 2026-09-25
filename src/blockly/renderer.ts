// oxlint-disable no-underscore-dangle -- Blockly names its renderer hooks with a
// trailing underscore, and overriding one means spelling it the same way.
import type { BlockSvg } from "blockly/core";
import { blockRendering, registry, utils, zelos } from "blockly/core";

export const RENDERER_NAME = "bloxide";

// Rounded as DESIGN.md draws them, keeping zelos's puzzle notch: it is how a
// child who has met Scratch recognises a block that joins to others.
const CORNER_RADIUS = 16;

// A C-block has to read as holding what is inside it: a wide arm, the inner
// blocks set in from it so the opening shows, and room left in an empty one
// so the child can see where blocks go.
const ARM_WIDTH = 20;
const INNER_INSET = 18;
const INNER_CORNER_RADIUS = 4;
const BOTTOM_BAR_HEIGHT = 26;
const EMPTY_MOUTH_HEIGHT = 48;
// The height zelos gives a row holding a value; see below.
const ROW_HEIGHT = 46;
// Room kept between the widest inner block and the C-block's right edge.
const MOUTH_RIGHT_PADDING = 12;

const { arc, point } = utils.svgPaths;

class BloxideConstants extends zelos.ConstantProvider {
  constructor() {
    super();
    this.CORNER_RADIUS = CORNER_RADIUS;
    this.STATEMENT_INPUT_PADDING_LEFT = ARM_WIDTH;
    this.BOTTOM_ROW_AFTER_STATEMENT_MIN_HEIGHT = BOTTOM_BAR_HEIGHT;
    this.EMPTY_STATEMENT_INPUT_HEIGHT = EMPTY_MOUTH_HEIGHT;
    // A label-only row ("forever", "hide") is otherwise shorter than one holding
    // a value ("repeat 10 times", "move 10 steps"), so blocks and C-block
    // headers would come in two heights.
    this.DUMMY_INPUT_MIN_HEIGHT = ROW_HEIGHT;
  }

  /** The mouth's own corners stay tight, as the design draws them, however round the outside is. */
  override makeInsideCorners() {
    const r = INNER_CORNER_RADIUS;
    return {
      width: r,
      height: r,
      pathTop: arc("a", "0 0,0", r, point(-r, r)),
      pathBottom: arc("a", "0 0,0", r, point(r, r)),
      rightWidth: r,
      rightHeight: r,
      pathTopRight: arc("a", "0 0,1", r, point(-r, r)),
      pathBottomRight: arc("a", "0 0,1", r, point(r, r)),
    };
  }
}

class BloxideRenderInfo extends zelos.RenderInfo {
  // Blockly sizes a C-block by its own row, so a wide block inside pokes out past
  // it and the pair reads as a stack. Widening it to wrap what it holds, as the
  // design draws it, makes the opening unmistakable.
  protected override computeBounds_(): void {
    for (const row of this.rows) {
      for (const element of row.elements) {
        if (!blockRendering.Types.isStatementInput(element)) continue;
        // Zelos draws the mouth's notch and seats the inner block from this one
        // offset, so moving it sets the blocks in from the arm and keeps the
        // notch above them lined up.
        element.notchOffset += INNER_INSET;
      }
    }
    super.computeBounds_();
    if (!this.rows.some((row) => row.hasStatement)) return;
    const wrapped = this.widthWithChildren + INNER_INSET + MOUTH_RIGHT_PADDING;
    if (wrapped <= this.width) return;
    this.width = wrapped;
    this.widthWithChildren = wrapped;
  }
}

class BloxideRenderer extends zelos.Renderer {
  protected override makeConstants_(): zelos.ConstantProvider {
    return new BloxideConstants();
  }

  protected override makeRenderInfo_(block: BlockSvg): zelos.RenderInfo {
    return new BloxideRenderInfo(this, block);
  }
}

// Guarded because a hot reload re-runs this module, and a second register throws.
if (!registry.hasItem(registry.Type.RENDERER, RENDERER_NAME)) {
  blockRendering.register(RENDERER_NAME, BloxideRenderer);
}
