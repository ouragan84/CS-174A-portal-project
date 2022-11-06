import {defs, tiny} from '/src/lib/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class Room_Sandbox extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            cube: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            cylinder: new defs.Capped_Cylinder(1, 40, [1, 2])
        };

        // *** Materials
        this.materials = {
            default: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, color: hex_color("#6da8e3")}),
            metal_pole: new Material(new defs.Phong_Shader(),
                {ambient: .5, diffusivity: 0.2, specularity: 1, color: hex_color("#90918d")}),
            lamp: new Material(new defs.Phong_Shader(),
                {ambient: .5, diffusivity: 0.2, specularity: 1, color: hex_color("#ffffff")}),
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 5, 20), vec3(0, 5, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
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
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(vec4(0, 2, 0, 1), hex_color("#f2eda7"), 1000)];

        let model_transform = Mat4.identity();

        let temp = model_transform.times(Mat4.scale(0.3, 0.3, 0.3))
        this.shapes.sphere.draw(context, program_state, temp, this.materials.default.override({color: hex_color("#db0718")}))

        this.draw_ground(context, program_state, model_transform, true)
        this.draw_walls(context, program_state, model_transform)
    }


    draw_ground(context, program_state, model_transform, draw_ceiling = false) {
        let origin = Mat4.identity()
        origin = origin.times(Mat4.scale(5, 0.05, 5))
        for(let i = -5; i < 5; i++) {
            for(let j = -5; j < 5; j++) {
                let temp = origin.times(Mat4.translation(2*i, 0, 2*j))
                this.shapes.cube.draw(context, program_state, temp, this.materials.default.override({color: hex_color("#403837")}))
            }
        }

        //the massive y translation is required because of the y scaling above
        if(draw_ceiling)
            for(let i = -5; i < 5; i++) {
                for(let j = -5; j < 5; j++) {
                    let temp = origin.times(Mat4.translation(2*i, 400, 2*j))
                    this.shapes.cube.draw(context, program_state, temp, this.materials.default.override({color: hex_color("#403837")}))
                }
            }
    }

    draw_walls(context, program_state, model_transform) {
        let origin = Mat4.identity()
        //BELOW: could be written more efficiency, refactor later

        //right wall
        for(let i = -5; i < 5; i++) {
            for(let j = 0; j < 2; j++) {
                // model_transform = model_transform.times(Mat4.translation(-1, 1, 0))
                //     .times(Mat4.rotation(angle, 0, 0, 1))
                //     .times(Mat4.translation(1, 1, 0))

                let temp = origin
                    .times(Mat4.translation(45, 5+j*10, i*10))
                    .times(Mat4.rotation(Math.PI/2, 0, 0, 1))
                    .times(Mat4.scale(5, 0.05, 5))
                this.shapes.cube.draw(context, program_state, temp, this.materials.plastic)
            }
        }

        //left wall
        for(let i = -5; i < 5; i++) {
            for(let j = 0; j < 2; j++) {
                // model_transform = model_transform.times(Mat4.translation(-1, 1, 0))
                //     .times(Mat4.rotation(angle, 0, 0, 1))
                //     .times(Mat4.translation(1, 1, 0))

                let temp = origin
                    .times(Mat4.translation(-55, 5+j*10, i*10))
                    .times(Mat4.rotation(Math.PI/2, 0, 0, 1))
                    .times(Mat4.scale(5, 0.05, 5))
                this.shapes.cube.draw(context, program_state, temp, this.materials.plastic)
            }
        }

        //far wall
        for(let i = -5; i < 5; i++) {
            for(let j = 0; j < 2; j++) {
                // model_transform = model_transform.times(Mat4.translation(-1, 1, 0))
                //     .times(Mat4.rotation(angle, 0, 0, 1))
                //     .times(Mat4.translation(1, 1, 0))

                let temp = origin
                    .times(Mat4.translation(i*10, 5+j*10, -55))
                    .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                    .times(Mat4.scale(5, 0.05, 5))
                this.shapes.cube.draw(context, program_state, temp, this.materials.plastic)
            }
        }

        //near wall
        for(let i = -5; i < 5; i++) {
            for(let j = 0; j < 2; j++) {
                // model_transform = model_transform.times(Mat4.translation(-1, 1, 0))
                //     .times(Mat4.rotation(angle, 0, 0, 1))
                //     .times(Mat4.translation(1, 1, 0))

                let temp = origin
                    .times(Mat4.translation(i*10, 5+j*10, 45))
                    .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                    .times(Mat4.scale(5, 0.05, 5))
                this.shapes.cube.draw(context, program_state, temp, this.materials.plastic)
            }
        }
    }
}

