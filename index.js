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
        // skip if no data, its not json, or it isn't a pixi-packer manifest
        if (!resource.data || !resource.isJson || !resource.data.meta || resource.data.meta.type !== "pixi-packer") {
            return next();
        }

        if (resource.data.meta.version > 1) {
            throw new Error("pixi-packer manifest version " + resource.data.meta.version + " not supported");
        }

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
                res.textures = {};
                spritesheet.sprites.forEach(function(sprite) {
                    var frame = new PIXI.Rectangle(
                        sprite.position.x,
                        sprite.position.y,
                        sprite.dimension.w,
                        sprite.dimension.h
                    );
                    var crop = frame.clone();
                    var trim = null;

                    //  Check to see if the sprite is trimmed
                    if (sprite.trim) {
                        trim = new PIXI.Rectangle(
                            sprite.trim.x / resolution,
                            sprite.trim.y / resolution,
                            frame.width / resolution,
                            frame.height / resolution
                        );

                        crop.width = sprite.trim.w / resolution;
                        crop.height = sprite.trim.h / resolution;
                        crop.x /= resolution;
                        crop.y /= resolution;
                    }

                    frame.x /= resolution;
                    frame.y /= resolution;
                    frame.width /= resolution;
                    frame.height /= resolution;

                    res.textures[sprite.name] = new PIXI.Texture(res.texture.baseTexture, frame, crop, trim, false);

                    // lets also add the frame to pixi's global cache for fromFrame and fromImage functions
                    PIXI.utils.TextureCache[sprite.name] = res.textures[sprite.name];
                });
                waiter.done();
            });
        });
    };
};
