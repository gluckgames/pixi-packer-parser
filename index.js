"use strict";

var Resource = require("resource-loader").Resource;

function pathWithoutFile(path) {
    var elements = path.split("/");
    elements.pop(); // remove filename
    return elements.join("/");
}

// Simple "wait for all" helper class
function WaitForAll(count, allDone) {
    var remaining = count;

    this.done = function() {
        remaining--;
        if (remaining === 0) {
            allDone();
        }
    };
}

module.exports = function (PIXI)
{
    return function (resource, next)
    {
        // skip if no data, its not json, or it isn't pixi-packer manifest
        if (!resource.data || !resource.isJson || !resource.data.meta || resource.data.meta.type !== "pixi-packer") {
            return next();
        }

        if (resource.data.meta.version > 1) {
            throw new Error("pixi-packer manifest version " + resource.data.meta.version + " not supported");
        }

        console.log(this);

        var loader = this;

        var loadOptions = {
            crossOrigin: resource.crossOrigin,
            loadType: Resource.LOAD_TYPE.IMAGE
        };

        var urlForManifest = resource.url.replace(loader.baseUrl, "");
        var route = pathWithoutFile(urlForManifest);

        var resolution = resource.data.resolution;

        // Load all spritesheets
        var waiter = new WaitForAll(resource.data.spritesheets.length, next);
        resource.data.spritesheets.forEach(function(spritesheet) {
            var name = spritesheet.image;
            var imageUrl = route + "/" + spritesheet.image;
            loader.add(name, imageUrl, loadOptions, function (res) {
                res.texture.baseTexture.resolution = resolution;
                res.texture.baseTexture.update();
                console.log(res.texture.baseTexture);
                res.textures = {};
                spritesheet.sprites.forEach(function(sprite) {
                    var size = null;
                    var trim = null;
                    var rect = sprite.frame;

                    if (sprite.rotated) {
                        size = new PIXI.Rectangle(rect.x, rect.y, rect.h, rect.w);
                    }
                    else {
                        size = new PIXI.Rectangle(rect.x, rect.y, rect.w, rect.h);
                    }

                    //  Check to see if the sprite is trimmed
                    if (sprite.trimmed)
                    {
                        trim = new PIXI.Rectangle(
                            sprite.spriteSourceSize.x / resolution,
                            sprite.spriteSourceSize.y / resolution,
                            sprite.sourceSize.w / resolution,
                            sprite.sourceSize.h / resolution
                         );
                    }

                    // flip the width and height!
                    if (sprite.rotated)
                    {
                        var temp = size.width;
                        size.width = size.height;
                        size.height = temp;
                    }

                    size.x /= resolution;
                    size.y /= resolution;
                    size.width /= resolution;
                    size.height /= resolution;

                    res.textures[sprite.name] = new PIXI.Texture(res.texture.baseTexture, size, size.clone(), trim, sprite.rotated);

                    // lets also add the frame to pixi's global cache for fromFrame and fromImage functions
                    PIXI.utils.TextureCache[sprite.name] = res.textures[sprite.name];
                    if (sprite.name === "start_vt") {
                        console.log(PIXI.utils.TextureCache[sprite.name]);
                    }
                });
                waiter.done();
            });
        });
    };
};
