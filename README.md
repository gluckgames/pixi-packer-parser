# pixi-packer-parser

The manifest files created by pixi-packer (https://github.com/Gamevy/pixi-packer) are not natively supported by pixi. You need to add this module to your asset loader. At the moment <strong>only PIXI >=3.0.0 is supported</strong>.

```javascript
var pixiPackerParser = require("pixi-packer-parser");
var PIXI = require("pixi.js");

var loader = new PIXI.loaders.Loader();
loader.after(pixiPackerParser(PIXI));
loader.add("path/to/my/manifest_DE_initial.json");
loader.on("progress", function (p) => { console.log("progress", p); });
loader.load(function () => { console.log("done"); });
```
