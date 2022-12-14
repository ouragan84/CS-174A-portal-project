import {defs, tiny} from './src/lib/common.js';
import {Axes_Viewer, Axes_Viewer_Test_Scene} from "./src/Scenes/examples/axes-viewer.js"
import {Collision_Demo, Inertia_Demo} from "./src/Scenes/examples/collisions-demo.js"
import {Many_Lights_Demo} from "./src/Scenes/examples/many-lights-demo.js"
import {Obj_File_Demo} from "./src/Scenes/examples/obj-file-demo.js"
import {Scene_To_Texture_Demo} from "./src/Scenes/examples/scene-to-texture-demo.js"
import {Surfaces_Demo} from "./src/Scenes/examples/surfaces-demo.js"
import {Text_Demo} from "./src/Scenes/examples/text-demo.js"
import {Transforms_Sandbox} from "./src/Scenes/examples/transforms-sandbox.js"
import {Room_Sandbox} from "./src/Scenes/room-sandbox.js";
import {Portal_Room} from "./src/Scenes/portal-room.js";
import {Game} from "./src/Scenes/game.js";

// Pull these names into this module's scope for convenience:
const {
    Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene,
    Canvas_Widget, Code_Widget, Text_Widget
} = tiny;

// Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and common.js.
// This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

// ******************** Extra step only for when executing on a local machine:
//                      Load any more files in your directory and copy them into "defs."
//                      (On the web, a server should instead just pack all these as well
//                      as common.js into one file for you, such as "dependencies.js")

const Minimal_Webgl_Demo = defs.Minimal_Webgl_Demo;

Object.assign(defs,
    {Axes_Viewer, Axes_Viewer_Test_Scene},
    {Inertia_Demo, Collision_Demo},
    {Many_Lights_Demo},
    {Obj_File_Demo},
    {Scene_To_Texture_Demo},
    {Surfaces_Demo},
    {Text_Demo},
    {Transforms_Sandbox},
    {Room_Sandbox},
    {Portal_Room},
    {Game}
);

// ******************** End extra step

// (Can define Main_Scene's class here)


const Main_Scene = Game;
const Additional_Scenes = [];

export {Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs}