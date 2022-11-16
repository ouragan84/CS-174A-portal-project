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
            square: new defs.Square
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

        this.wall_transforms = this.do_walls_calc(Mat4.identity())
        this.ground_transforms = this.do_ground_calc(Mat4.identity(), true)

        

        // //fps movement
        // this.yaw = Mat4.identity();
        // this.pitch = Mat4.identity();
        
        // this.sensitivity = 0.2;

        this.eye_vector = vec3(0,5,20);
        this.look_at_vector = vec3(0,5,0);
        this.upvector = vec3(0,1,0);

        // (eye vector, at vecotr, up vector)
        this.initial_camera_location = Mat4.look_at(this.eye_vector, this.look_at_vector, this.upvector);

        // // this.mouse = {"from_center": vec(0,0)};
        // // this.mouse = vec(0,0);

        // // console.log("mouse from center is ", this.mouse.from_center);
        //  // fps movement
        //  const canvas = document.getElementById("main-canvas");

        //  // setting up pointer lock for mouse control
        //  canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        //  document.exitPointerLcok = document.exitPointerLock || document.mozExitPointerLock;
 
        //  canvas.onclick = function(){
        //      console.log("click");
        //      canvas.requestPointerLock();
        //  };
 
        
        //  // fires whenever a change in pointer lock state occurs
        //  document.addEventListener('pointerlockchange',changeCallback, false);
        //  document.addEventListener('mozpointerlockchange', changeCallback,false);
 
        //  var mouse_position = function( e ) { console.log("movement ", vec( e.movementX, e.movementY )); return vec( e.movementX, e.movementY ); };
        //  // if the pointer is locked, then listen to the mousemove and update the camera
        //  function changeCallback() {
        //      if (document.pointerLockElement === canvas ||
        //          document.mozPointerLockElement === canvas) {
        //            console.log('The pointer lock status is now locked');
        //            document.addEventListener("mousemove", (e) => {
        //                this.mouse = mouse_position(e); console.log("mouse position: ", this.mouse)}, false)
 
        //        } else {
        //            console.log('The pointer lock status is now unlocked');
        //            document.addEventListener("mouseout", (e) => {
        //                this.mouse = mouse_position(e);}, false)
        //          //   this.unlockHook(this.canvas);
                   
        //        };

        //     //    console.log("mouse position: ", this.mouse);
        //  }

    
 
         
 
    }

    make_control_panel() {
        //fps movement
        this.yaw = Mat4.identity();
        this.pitch = Mat4.identity();
    

        this.mouse = {"from_center": vec(0,0)};
        // this.mouse = vec(0,0);

        // console.log("mouse from center is ", this.mouse.from_center);
         // fps movement
         const canvas = document.getElementById("main-canvas");

         // setting up pointer lock for mouse control
         canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
         document.exitPointerLcok = document.exitPointerLock || document.mozExitPointerLock;
 
         canvas.onclick = function(){
             console.log("click");
             canvas.requestPointerLock();
         };
         
         console.log("mouse from center: ", this.mouse.from_center);
        
         // fires whenever a change in pointer lock state occurs
         document.addEventListener('pointerlockchange',changeCallback, false);
         document.addEventListener('mozpointerlockchange', changeCallback,false);
 
         var mouse_position = function( e ) { console.log("movement ", vec( e.movementX, e.movementY )); return vec( e.movementX, e.movementY ); };
         // if the pointer is locked, then listen to the mousemove and update the camera
         function changeCallback() {
             if (document.pointerLockElement === canvas ||
                 document.mozPointerLockElement === canvas) {
                   console.log('The pointer lock status is now locked');
                   canvas.addEventListener("mousemove", (e) => {
                       this.mouse.from_center = mouse_position(e); console.log("mouse position: ", this.mouse.from_center)}, false)
 
               } else {
                   console.log('The pointer lock status is now unlocked');
                   canvas.addEventListener("mouseout", (e) => {
                    this.mouse.from_center = mouse_position(e);}, false)
                 //   this.unlockHook(this.canvas);
                   
               };

            //    console.log("mouse position: ", this.mouse);
         }

      
        
    }

    

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        // console.log(`hello`);
        // console.log("the context is ", context);
        // console.log("the program state is ", program_state);

        if (!context.scratchpad.controls) {
            console.log("enter context scratchpad");
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            console.log("context.scratchpad.controls: ", context.scratchpad.controls);
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        // console.log("initial camera location: ", this.initial_camera_location);
        // console.log("eye vector ", this.eye_vector, " look at vector ", this.look_at_vector, " up vector ", this.upvector);


       

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        var leeway = 70, degrees_per_frame = 0.004*dt*1000, meters_per_frame = this.sensitivity * dt * 1000;

        if (this.mouse.from_center != undefined){

            // console.log("enter if statement ", this.mouse);

            if(this.mouse.from_center[0] != 0 && this.mouse.from_center[1] !=0){

                console.log("enter the double if statement");
                this.yaw = (Mat4.rotation(this.mouse.from_center[0]*degrees_per_frame,0,1,0))*(this.yaw);
                this.pitch = (Mat4.rotation(this.mouse.from_center[1]*degrees_per_frame,1,0,0))*(this.pitch);

                let new_camera = (this.yaw)*(this.pitch)*(this.initial_camera_location);
                console.log("update camera location: ", program_state.set_camera(new_camera));
            }

        }

        

        // context.scratchpad.controls.display(context,program_state,t);
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(vec4(0, 2, 0, 1), hex_color("#f2eda7"), 1000)];

        let model_transform = Mat4.identity();

        //sphere at origin for reference
        let temp = model_transform.times(Mat4.scale(0.3, 0.3, 0.3))
        this.shapes.sphere.draw(context, program_state, temp, this.materials.default.override({color: hex_color("#db0718")}))

        this.draw_ground(context, program_state, Mat4.identity(), true)
        this.draw_walls(context, program_state, Mat4.identity())
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

