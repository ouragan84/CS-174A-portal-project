import {defs, tiny} from '/src/lib/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;
const {Phong_Shader, Fake_Bump_Map} = defs;


export class Game extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        const screen_height = 600;
        const screen_width = 1080;

        this.scratchpad_blue_portal = document.createElement('canvas');
        // A hidden canvas for re-sizing the real canvas to be square:
        this.scratchpad_context_blue_portal = this.scratchpad_blue_portal.getContext('2d');
        this.scratchpad_blue_portal.width = screen_width;
        this.scratchpad_blue_portal.height = screen_height;                // Initial image source: Blank gif file:
        this.texture_blue_portal = new Texture("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

        this.scratchpad_orange_portal = document.createElement('canvas');
        // A hidden canvas for re-sizing the real canvas to be square:
        this.scratchpad_context_orange_portal = this.scratchpad_orange_portal.getContext('2d');
        this.scratchpad_orange_portal.width = screen_width;
        this.scratchpad_orange_portal.height = screen_height;                // Initial image source: Blank gif file:
        this.texture_orange_portal = new Texture("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            quad: new defs.Square(),
            circle: new defs.Regular_2D_Polygon(1, 48),
            box: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            square: new defs.Square
        };

        // *** Materials
        this.materials = {
            default: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, color: hex_color("#6da8e3")}),
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            earth: new Material(new Fake_Bump_Map(1), {ambient: .5, texture: new Texture("src/assets/earth.gif")}),
            blue_portal: new Material(new Textured_Portal(), {texture: this.texture_blue_portal, screen_width:screen_width,
                screen_height:screen_height, color:hex_color("#0066BB"), distance_start:.9, distance_end:0.1}),
            orange_portal: new Material(new Textured_Portal(), {texture: this.texture_orange_portal, screen_width:screen_width,
                screen_height:screen_height, color:hex_color("#BB6600"), distance_start:.9, distance_end:0.1}),
            phong: new Material(new Phong_Shader(), {ambient: .5}),
        }

        this.wall_transforms = this.do_walls_calc(Mat4.identity())
        this.ground_transforms = this.do_ground_calc(Mat4.identity(), true)

        this.initial_camera_location = Mat4.look_at(vec3(0, 5, 20), vec3(0, 5, 0), vec3(0, 1, 0));
        this.spin = 0;
        this.cube_1 = Mat4.translation(-4 , 0, 2);

        this.main_camera = {
            pos: vec3(0, 5, 0),
            top: vec3(0, 1, 0),
            look_dir: null,
            transform: null,
            rot: vec3(0, 0, 0),
            pos_dir: vec3(0, 0, 0),
            rot_dir: vec3(0, 0, 0),
            speed: 10.0,
            turning_speed: 0.5 * Math.PI
        }

        this.portal_blue = {
            pos: vec3(10, -5, 10),
            scale: vec3(4, 5, 4),
            normal: vec3(0, 0, -1),
            top: vec3(0, 1, 0),
            color_behind: hex_color("#0066BB"),
            screen_transform: null,
            basis_transform: null,
            camera: {
                pos: vec3(),
                look_dir: vec3(),
                top: vec3(),
                transform: null
            }
        }

        this.portal_orange = {
            pos: vec3(0, -5, 10),
            scale: vec3(4, 5, 4),
            normal: vec3(0, 0, 1),
            top: vec3(0, 1, 0),
            color_behind: hex_color("#BB6600"),
            screen_transform: null,
            basis_transform: null,
            camera: {
                pos: vec3(),
                look_dir: vec3(),
                top: vec3(),
                transform: null
            }
        }

        this.compute_portal_transform( this.portal_blue);
        this.compute_portal_transform( this.portal_orange);
    }

    make_control_panel() {
        this.key_triggered_button("Cube rotation", ["c"], () => this.spin ^= 1);

        this.live_string(box => {
            box.textContent = this.spin
        });
        this.new_line();

        this.result_img_blue_portal = this.control_panel.appendChild(Object.assign(document.createElement("img"),
            {style: "width:200px; height:" + 200 * this.aspect_ratio + "px"}));

        this.new_line();

        this.result_img_orange_portal = this.control_panel.appendChild(Object.assign(document.createElement("img"),
            {style: "width:200px; height:" + 200 * this.aspect_ratio + "px"}));

        this.key_triggered_button("Up", [" "], () => this.main_camera.pos_dir[1] = 1, undefined, () => this.main_camera.pos_dir[1] = 0);
        this.key_triggered_button("Forward", ["w"], () => this.main_camera.pos_dir[2] = -1, undefined, () => this.main_camera.pos_dir[2] = 0);
        this.new_line();
        this.key_triggered_button("Left", ["a"], () => this.main_camera.pos_dir[0] = -1, undefined, () => this.main_camera.pos_dir[0] = 0);
        this.key_triggered_button("Back", ["s"], () => this.main_camera.pos_dir[2] = 1, undefined, () => this.main_camera.pos_dir[2] = 0);
        this.key_triggered_button("Right", ["d"], () => this.main_camera.pos_dir[0] = 1, undefined, () => this.main_camera.pos_dir[0] = 0);
        this.new_line();
        this.key_triggered_button("Down", ["z"], () => this.main_camera.pos_dir[1] = -1, undefined, () => this.main_camera.pos_dir[1] = 0);

        this.new_line();
        this.key_triggered_button("Look Left", ["q"], () => this.main_camera.rot_dir[0] = 1, undefined, () => this.main_camera.rot_dir[0] = 0);
        this.key_triggered_button("Look Right", ["e"], () => this.main_camera.rot_dir[0] = -1, undefined, () => this.main_camera.rot_dir[0] = 0);
        this.new_line();
        this.key_triggered_button("Look Up", ["r"], () => this.main_camera.rot_dir[1] = 1, undefined, () => this.main_camera.rot_dir[1] = 0);
        this.key_triggered_button("Look Down", ["f"], () => this.main_camera.rot_dir[1] = -1, undefined, () => this.main_camera.rot_dir[1] = 0);

        this.new_line();
        this.key_triggered_button("Print Camera", ["x"], () => console.log(this.main_camera));

    }

    // i j k must be orthogonal
    to_basis(i, j, k, origin){
        const i_ = i.normalized();
        const j_ = j.normalized();
        const k_ = k.normalized();

        return Matrix.of(i_.to4(false), j_.to4(false), k_.to4(false), [0, 0, 0, 1]).times( Mat4.translation(-origin[0], -origin[1], -origin[2]) );
    }

    compute_portal_transform(portal){
        portal.screen_transform =
            this.to_basis( portal.top.cross(portal.normal), portal.top, portal.normal, portal.pos)
                .times(Mat4.scale(portal.scale[0], portal.scale[1], portal.scale[2]))
    }

    update_texture(context, scratchpad, scratchpad_context, texture, result_img){
        scratchpad_context.drawImage(context.canvas, 0, 0,  scratchpad.width, scratchpad.width, 0, 0, scratchpad.width, scratchpad.width);
        result_img.src = scratchpad.toDataURL("image/png");

        texture.image.src = result_img.src;
    }

    clear_buffer(context, texture){
        // Don't call copy to GPU until the event loop has had a chance
        // to act on our SRC setting once:
        if (this.skipped_first_frame)
            // Update the texture with the current scene:
            texture.copy_onto_graphics_card(context.context, false);
        this.skipped_first_frame = true;

        // Start over on a new drawing, never displaying the prior one:
        context.context.clear(context.context.COLOR_BUFFER_BIT | context.context.DEPTH_BUFFER_BIT);
    }

    update_main_camera(dt){
        this.main_camera.rot.add_by(this.main_camera.rot_dir.times(dt*this.main_camera.turning_speed));
        this.main_camera.rot.forEach(e => e = e%(2.0*Math.PI));

        this.main_camera.pos.add_by(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0)
            .times(Mat4.rotation(this.main_camera.rot[1], 1, 0, 0)).times(this.main_camera.pos_dir.times(dt*this.main_camera.speed)));

        this.main_camera.look_dir = Mat4.identity()
            .times(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0))
            .times(Mat4.rotation(this.main_camera.rot[1], 1, 0, 0))
            .times(Mat4.translation(0, 0, -1))
            .times(vec4(0,0,0,1)).to3();

        const look_at_point = this.main_camera.look_dir.plus(this.main_camera.pos);

        this.main_camera.transform = Mat4.look_at(this.main_camera.pos, look_at_point, this.main_camera.top);
    }

    update_portal_camera(portal, other, camera, str){
        // const trans = this.to_basis( other.top.cross(other.normal), other.top, other.normal, other.pos)
        //     .times(Mat4.inverse(this.to_basis( portal.top.cross(portal.normal.times(-1)), portal.top, portal.normal.times(-1), portal.pos)));

        const trans = Mat4.inverse(this.to_basis( portal.top.cross(portal.normal.times(-1)), portal.top, portal.normal.times(-1), portal.pos))
            .times(this.to_basis( other.top.cross(other.normal), other.top, other.normal, other.pos));

        // console.log(str, this.to_basis( other.top.cross(other.normal), other.top, other.normal, other.pos),
        // Mat4.inverse(this.to_basis( portal.top.cross(portal.normal.times(-1)), portal.top, portal.normal.times(-1), portal.pos)));

        camera.look_dir = trans.times(this.main_camera.look_dir.to4(false)).to3();
        camera.top = trans.times(this.main_camera.top.to4(false)).to3();
        camera.pos = trans.times(this.main_camera.pos.to4(true)).to3();

        const look_at_point = camera.look_dir.plus(camera.pos);

        camera.transform = Mat4.look_at(camera.pos, look_at_point, camera.top);

        portal.basis_transform = trans;
    }

    draw_portals_recursive(context, program_state, t){
        // RENDER FROM BLUE PORTAL PERSPECTIVE, PASTE ONTO ORANGE PORTAL
        program_state.set_camera(this.portal_blue.camera.transform);
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, .5, 500);
        this.draw_visible_scene(context, program_state, t);
        this.draw_player(context, program_state);
        // this.draw_portal(context, program_state, this.portal_orange, this.materials.orange_portal, Mat4.identity());
        this.update_texture(context, this.scratchpad_orange_portal, this.scratchpad_context_orange_portal, this.texture_orange_portal, this.result_img_orange_portal);
        this.clear_buffer(context, this.texture_orange_portal);


        // RENDER FROM ORANGE PORTAL PERSPECTIVE, PASTE ONTO BLUE PORTAL
        program_state.set_camera(this.portal_orange.camera.transform);
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, .5, 500);
        this.draw_visible_scene(context, program_state, t);
        this.draw_player(context, program_state);
        // this.draw_portal(context, program_state, this.portal_blue, this.materials.blue_portal, this.portal_blue.basis_transform);
        this.update_texture(context, this.scratchpad_blue_portal, this.scratchpad_context_blue_portal, this.texture_blue_portal, this.result_img_blue_portal);
        this.clear_buffer(context, this.texture_blue_portal);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, .1, 1000);

        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(vec4(0, 2, 0, 1), hex_color("#f2eda7"), 1000)];

        this.update_main_camera(dt);
        this.update_portal_camera(this.portal_blue, this.portal_orange, this.portal_blue.camera, "blue");
        this.update_portal_camera(this.portal_orange, this.portal_blue, this.portal_orange.camera, "orange");
        this.draw_portals_recursive(context, program_state, t);

        //  RENDER FROM MAIN CAMERA
        program_state.set_camera(this.main_camera.transform);
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, .5, 500);

        this.draw_visible_scene(context, program_state, t);
        this.draw_portal(context, program_state, this.portal_blue, this.materials.blue_portal, Mat4.identity());
        this.draw_portal(context, program_state, this.portal_orange, this.materials.orange_portal, Mat4.identity());
    }

    draw_visible_scene(context, program_state, t) {
        this.draw_ground(context, program_state, Mat4.identity(), true)
        this.draw_walls(context, program_state, Mat4.identity())

        //sphere at origin for reference
        // const origin = Mat4.identity();
        // let temp = origin.times(Mat4.scale(0.3, 0.3, 0.3))
        // this.shapes.sphere.draw(context, program_state, temp, this.materials.default.override({color: hex_color("#db0718")}))
    }

    draw_portal(context, program_state, portal, material, basis){

        this.shapes.circle.draw(context, program_state, basis.times(portal.screen_transform)
            , material);
    }

    draw_player(context, program_state){
        this.shapes.box.draw(context, program_state,
            Mat4.translation(this.main_camera.pos[0], this.main_camera.pos[1], this.main_camera.pos[2])
                .times(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0))
                .times(Mat4.rotation(this.main_camera.rot[1], 1, 0, 0))
                .times(Mat4.translation(0, -.2, 0))
                .times(Mat4.scale(.3, .8, .3)),
            this.materials.phong.override({color: hex_color("#FFFFFF")}));
    }

    draw_walls(context, program_state) {
        for(let i = 0; i < this.wall_transforms.length; i++) {
            this.shapes.square.draw(context, program_state, this.wall_transforms[i], this.materials.plastic)
        }
    }

    draw_ground(context, program_state) {
        const materials = [this.materials.default.override({color: hex_color("#403837")}), this.materials.plastic]
        for(let i = 0; i < this.ground_transforms.length; i++) {
            for(let j = 0; j < this.ground_transforms[i].length; j++) {
                this.shapes.square.draw(context, program_state, this.ground_transforms[i][j], materials[i])
            }
        }
    }

    do_ground_calc(model_transform, draw_ceiling = false) {
        const k_max = draw_ceiling ? 2 : 1;

        let ground_transforms = [[],[]]
        for(let k = 0; k < k_max; k++) {
            const y = (k == 0 ? 0 : 20)

            for(let i = -5; i < 5; i++) {
                for(let j = -5; j < 5; j++) {
                    let temp = model_transform
                        .times(Mat4.translation(10*i, y, 10*j))
                        .times(Mat4.scale(5, 1, 5))
                        .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                    ground_transforms[k].push(temp)
                }
            }
        }
        return ground_transforms
    }

    do_walls_calc(model_transform, height = 2) {
        const walls = {
            right: (i, j) => {
                return model_transform
                    .times(Mat4.translation(45, 5+j*10, i*10))
                    .times(Mat4.scale(1, 5, 5))
                    .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
            },
            left: (i, j) => {
                return model_transform
                    .times(Mat4.translation(-55, 5+j*10, i*10))
                    .times(Mat4.scale(1, 5, 5))
                    .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
            },
            far: (i, j) => {
                return model_transform
                    .times(Mat4.translation(i*10, 5+j*10, -55))
                    .times(Mat4.scale(5, 5, 1))
                    .times(Mat4.rotation(Math.PI/2, 0, 0, 1))
            },
            near: (i, j) => {
                return model_transform
                    .times(Mat4.translation(i*10, 5+j*10, 45))
                    .times(Mat4.scale(5, 5, 1))
                    .times(Mat4.rotation(Math.PI/2, 0, 0, 1))
            }
        }

        let wall_transforms = []
        for(const [_, transform] of Object.entries(walls)) {
            for(let i = -5; i < 5; i++) {
                for(let j = 0; j < height; j++) {
                    wall_transforms.push(transform(i, j))
                }
            }
        }
        return wall_transforms;
    }
}

class Textured_Portal extends Shader {
    // This is a Shader using Phong_Shader as template

    constructor() {
        super();
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
         `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            uniform mat4 projection_camera_model_transform;
            attribute vec3 position;                           
            
            void main(){                                                  
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                point_position = vec4(position, 1.0);
                center = vec4(0, 0, 0, 1);
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            uniform sampler2D texture;
            uniform float screen_height;
            uniform float screen_width;
            uniform float distance_start;
            uniform float distance_end;
            uniform vec4 color;

            void main(){                                              
                vec2 pos_in_screen = vec2(gl_FragCoord.x/screen_width, gl_FragCoord.y/screen_height);
                vec4 pixel_color = texture2D(texture, pos_in_screen);

                float dist = distance(center, point_position);
                if( dist >= distance_start){
                    if(dist <= distance_start + distance_end){
                        float alpha = -(distance_start - dist) / distance_end;
                        pixel_color = pixel_color*(1.0-alpha) + color*alpha;
                    }else{
                        pixel_color = color;
                    }
                }
                
                gl_FragColor = pixel_color;
            } `;
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);

        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        material = Object.assign({}, {}, material);
        context.uniform1f(gpu_addresses.screen_height, material.screen_height);
        context.uniform1f(gpu_addresses.screen_width, material.screen_width);
        context.uniform4fv(gpu_addresses.color, material.color);
        context.uniform1f(gpu_addresses.distance_start, material.distance_start);
        context.uniform1f(gpu_addresses.distance_end, material.distance_end);

        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);

        if (material.texture && material.texture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i(gpu_addresses.texture, 0);
            // For this draw, use the texture image from correct the GPU buffer:
            material.texture.activate(context);
        }
    }
}

