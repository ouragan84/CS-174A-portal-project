import {defs, tiny} from '../lib/common.js';
import {Body} from "./examples/collisions-demo.js";
import {Level} from "./level.js";
// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;
const {Phong_Shader, Fake_Bump_Map, Tex} = defs;

export class Game extends Scene {                   // **Scene_To_Texture_Demo** is a crude way of doing multi-pass rendering.
    // We will draw a scene (containing just the left box with the striped
    // texture) to a hidden canvas.  The hidden canvas's colors are copied
    // to an HTML Image object, and then to one of our Textures.  Finally,
    // we clear the buffer in the middle of display() and start over.
    // The scene is drawn again (with a different texture) and a new box
    // on the right side, textured with the first scene.
    // NOTE: To use this for two-pass rendering, you simply need to write
    // any shader that acts upon the input texture as if it were a
    // previous rendering result.
    constructor() {               // Request the camera, shapes, and materials our Scene will need:
        super();
        this.shapes = {
            circle: new defs.Regular_2D_Polygon(1, 48),
            box: new defs.Cube(),
            square: new defs.Square(),
            sphere: new defs.Subdivision_Sphere(4),
            portal: new defs.Rounded_Capped_Cylinder(3, 24),
        }

        this.view_options = {
            screen_height: 600,
            screen_width: 1080,
            far:100,
            near:0.005,
            half_angle: Math.PI / 180 * 55
        }

        this.view_options.proj_mat = Mat4.perspective(this.view_options.half_angle, this.view_options.screen_width / this.view_options.screen_height, this.view_options.near, this.view_options.far);

        this.textures = {
            blue_portal_primary: this.generate_texture_attributes( this.view_options.screen_width, this.view_options.screen_height, hex_color("#0066BB")),
            blue_portal_secondary: this.generate_texture_attributes( this.view_options.screen_width, this.view_options.screen_height, hex_color("#0066BB")),
            orange_portal_primary: this.generate_texture_attributes(this.view_options.screen_width, this.view_options.screen_height, hex_color("#FF6600")),
            orange_portal_secondary: this.generate_texture_attributes( this.view_options.screen_width, this.view_options.screen_height, hex_color("#FF6600")),
        }

        this.materials =
            {
                earth: new Material(new Fake_Bump_Map(1), {ambient: .5, texture: new Texture("src/assets/earth.gif")}),

                wall_portal: new Material(new defs.Textured_Phong(), {ambient: .8, diffusivity: 0, specularity:0, texture: new Texture("src/assets/portal_wall.png")}),

                wall_regular: new Material(new defs.Textured_Phong(), {ambient: .8, diffusivity: 0, specularity:0, texture: new Texture("src/assets/regular_wall.png")}),

                phong: new Material(new Phong_Shader(), {ambient: .5}),

                plastic: new Material(new defs.Phong_Shader(),
                    {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),

                default: new Material(new defs.Phong_Shader(),
                    {ambient: 1, diffusivity: 0.1, specularity: 0.1, color: hex_color("#6da8e3")}),
                projectile: new Material(new defs.Phong_Shader(), {ambient: 1, diffusivity: 0, specularity: 1.0}) //probably change
            }

        // this.spin = 0;
        // this.cube_1 = Mat4.translation(14 , 1.1, 14);

        this.main_camera = {
            pos: vec3(5, 1, 5),
            top: vec3(0, 1, 0),
            look_dir: null,
            transform: null,
            rot: vec3(0, 0, 0),
            pos_dir: vec3(0, 0, 0),
            rot_dir: vec3(0, 0, 0),
            speed: 3.0,
            turning_speed: 0.8 * Math.PI
        }

        this.portal_blue = {
            pos: vec3(5, 1, 0.1),
            scale: vec3(1, 1, .1),
            disp: vec3(0, 0, -.04),
            normal: vec3(0, 0, 1),
            top: vec3(0, 1, 0),
            color_behind: hex_color("#0080FF"),
            screen_transform: null,
            inv_screen_transform: null,
            basis_transform: null,
            camera: {
                pos: vec3(),
                look_dir: vec3(),
                top: vec3(),
                transform: null
            },
            camera_sec: {
                pos: vec3(),
                look_dir: vec3(),
                top: vec3(),
                transform: null
            },
            body: null
        }

        this.portal_orange = {
            pos: vec3(0.1, 1, 5),
            scale: vec3(1, 1, .1),
            disp: vec3(0, 0, -.049),
            normal: vec3(1, 0, 0),
            top: vec3(0, 1, 0),
            color_behind: hex_color("#FF8000"),
            screen_transform: null,
            inv_screen_transform: null,
            basis_transform: null,
            camera: {
                pos: vec3(),
                look_dir: vec3(),
                top: vec3(),
                transform: null
            },
            camera_sec: {
                pos: vec3(),
                look_dir: vec3(),
                top: vec3(),
                transform: null
            },
            body: null
        }

        this.velocity_y = 0;
        
        this.projectiles = [];
        this.collider = {intersect_test: Body.intersect_cube, points: new defs.Subdivision_Sphere(4), leeway: .3}

        this.compute_portal_transform( this.portal_blue,  this.portal_orange);
        this.compute_portal_transform( this.portal_orange, this.portal_blue);

        // this.wall_transforms = this.do_walls_calc(Mat4.identity())
        // this.ground_transforms = this.do_ground_calc(Mat4.identity(), true)

        this.draw_secondary_portals = true;

        // this.wall_bodies = level.get_wall_bodies(level.array);

        this.level = new Level();
        this.t = 0;
        this.last_fired = 0;
    }
    
    generate_texture_attributes(width, height, color){
        let place = {};

        place.scratchpad = document.createElement('canvas');
        place.scratchpad_context = place.scratchpad.getContext('2d');
        place.scratchpad.width = width;
        place.scratchpad.height = height;
        place.texture = new Texture("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        place.material = new Material(new Textured_Portal(), {texture: place.texture, screen_width:width,
            screen_height:height, color:color, distance_start:1.0, distance_end:0.1});

        place.result_img = null;

        return place;
    }

    get_cosine_interpolation(min, max, period, t, t_offset){
        return (max-min)/2.0 * ( -Math.cos( Math.PI * ( 2*(t - t_offset)/period) ) + 1 ) + min ;
    }

    make_control_panel() {
        this.key_triggered_button("Cube rotation", ["c"], () => this.spin ^= 1);

        this.new_line();

        this.textures.blue_portal_primary.result_img = this.control_panel.appendChild(Object.assign(document.createElement("img"),
            {style: "width:200px; height:" + 200 * this.aspect_ratio + "px"}));

        this.textures.blue_portal_secondary.result_img = this.control_panel.appendChild(Object.assign(document.createElement("img"),
            {style: "width:200px; height:" + 200 * this.aspect_ratio + "px"}));

        this.new_line();

        this.textures.orange_portal_primary.result_img = this.control_panel.appendChild(Object.assign(document.createElement("img"),
            {style: "width:200px; height:" + 200 * this.aspect_ratio + "px"}));

        this.textures.orange_portal_secondary.result_img = this.control_panel.appendChild(Object.assign(document.createElement("img"),
            {style: "width:200px; height:" + 200 * this.aspect_ratio + "px"}));

        this.new_line();

        this.key_triggered_button("Up", [" "], () => this.main_camera.pos_dir[1] = 1, undefined, () => this.main_camera.pos_dir[1] = 0);
        this.key_triggered_button("Down", ["z"], () => this.main_camera.pos_dir[1] = -1, undefined, () => this.main_camera.pos_dir[1] = 0);
        this.new_line();
        this.key_triggered_button("Left Click (blue)", ["["], () => this.shoot_projectile("blue"))
        this.key_triggered_button("Right Click (orange)", ["]"], () => this.shoot_projectile("orange"))

        this.key_triggered_button("Jump", [" "], () => this.jump());
        this.key_triggered_button("Forward", ["w"], () => this.main_camera.pos_dir[2] = -1, undefined, () => this.main_camera.pos_dir[2] = 0);
        this.key_triggered_button("Back", ["s"], () => this.main_camera.pos_dir[2] = 1, undefined, () => this.main_camera.pos_dir[2] = 0);
        this.new_line();
        this.key_triggered_button("Left", ["a"], () => this.main_camera.pos_dir[0] = -1, undefined, () => this.main_camera.pos_dir[0] = 0);
        this.key_triggered_button("Right", ["d"], () => this.main_camera.pos_dir[0] = 1, undefined, () => this.main_camera.pos_dir[0] = 0);
        this.new_line();
        //this.key_triggered_button("Down", ["z"], () => this.main_camera.pos_dir[1] = -1, undefined, () => this.main_camera.pos_dir[1] = 0);

        this.new_line();
        this.key_triggered_button("Look Left", ["q"], () => this.main_camera.rot_dir[0] = 1, undefined, () => this.main_camera.rot_dir[0] = 0);
        this.key_triggered_button("Look Right", ["e"], () => this.main_camera.rot_dir[0] = -1, undefined, () => this.main_camera.rot_dir[0] = 0);
        this.new_line();
        this.key_triggered_button("Look Up", ["r"], () => this.main_camera.rot_dir[1] = 1, undefined, () => this.main_camera.rot_dir[1] = 0);
        this.key_triggered_button("Look Down", ["f"], () => this.main_camera.rot_dir[1] = -1, undefined, () => this.main_camera.rot_dir[1] = 0);

        this.new_line();

        this.key_triggered_button("Draw Secondary Portals", ["p"], () => this.draw_secondary_portals ^= true);

    }

    // i j k must be orthogonal
    to_basis(i, j, k, origin){
        const i_ = i.normalized();
        const j_ = j.normalized();
        const k_ = k.normalized();

        return Matrix.of(i_.to4(false), j_.to4(false), k_.to4(false), [0, 0, 0, 1]).times( Mat4.translation(-origin[0], -origin[1], -origin[2]) );
    }

    compute_portal_transform(portal, other){
        let re_trans = this.to_basis( portal.top.cross(portal.normal), portal.top, portal.normal, portal.pos );
 
        portal.inv_screen_transform = Mat4.inverse(re_trans).times(Mat4.translation(portal.disp[0], portal.disp[1], portal.disp[2]))
            .times(Mat4.scale(portal.scale[0], portal.scale[1], portal.scale[2]));
        portal.screen_transform = Mat4.inverse(portal.inv_screen_transform);

        portal.dist_from_origin = portal.normal.dot(portal.pos);

        portal.basis_transform = (Mat4.inverse(this.to_basis( portal.top.cross(portal.normal.times(-1)), portal.top, portal.normal.times(-1), portal.pos)))
        .times(this.to_basis( other.top.cross(other.normal), other.top, other.normal, other.pos))
    }

    clear_buffer(context, texture){
        // Don't call copy to GPU until the event loop has had a chance
        // to act on our SRC setting once:
        if (this.skipped_first_frame)
            // Update the texture with the current scene:
            texture.texture.copy_onto_graphics_card(context.context, false);
        this.skipped_first_frame = true;

        // Start over on a new drawing, never displaying the prior one:
        context.context.clear(context.context.COLOR_BUFFER_BIT | context.context.DEPTH_BUFFER_BIT);

        // texture.scratchpad_context.context.clear(context.context.COLOR_BUFFER_BIT | context.context.DEPTH_BUFFER_BIT);
    }

    update_texture(texture, context){
        texture.scratchpad_context.drawImage(context.canvas, 0, 0,  texture.scratchpad.width, 
            texture.scratchpad.width, 0, 0, texture.scratchpad.width, texture.scratchpad.width);
        texture.result_img.src = texture.scratchpad.toDataURL("image/png");

        texture.texture.image.src = texture.result_img.src;
    }

    reset_texture(texture){
        texture.scratchpad_context.filltyle = "black";
        texture.scratchpad_context.fillRect( 0, 0,  texture.scratchpad.width, texture.scratchpad.width);
        texture.result_img.src = texture.scratchpad.toDataURL("image/png");
        texture.texture.image.src =texture.result_img.src;
    }

    draw_visible_scene(context, program_state, t){
        // this.draw_ground(context, program_state)
        // this.draw_walls(context, program_state)
        this.draw_projectiles(context, program_state)

        // this.shapes.box.draw(context, program_state, this.cube_1, this.materials.earth);

        // this.shapes.box.draw(context, program_state, Mat4.identity()
        //         .times(Mat4.translation(7,1,1))
        //         .times(Mat4.scale(.3,.3,.3)),
        //     this.materials.phong.override({color: hex_color("#FF80FF")}));

        // this.shapes.box.draw(context, program_state, Mat4.identity()
        //         .times(Mat4.translation(2, this.get_cosine_interpolation(1, 4, 3, t, 0), 12))
        //         .times(Mat4.scale(.3,.5,.3)),
        //     this.materials.phong.override({color: hex_color("#00FF55")}));

        // this.shapes.box.draw(context, program_state, Mat4.identity()
        //         .times(Mat4.translation(2, .5, 8))
        //         .times(Mat4.scale(.5,.5,this.get_cosine_interpolation(1, .2, 1.2, t, 0))),
        //     this.materials.phong.override({color: hex_color("#f76d28")}));

        // this.shapes.box.draw(context, program_state, Mat4.identity()
        //         .times(Mat4.translation(0,0,0))
        //         .times(Mat4.scale(.2,.2,.2)),
        //     this.materials.phong.override({color: hex_color("#00FFFF")}));

        this.level.draw_walls(context, program_state, this.materials.wall_portal, this.materials.wall_regular, this.shapes.square);
    }

    draw_portal(context, program_state, portal, material, draw_filled=false){
        this.shapes.portal.draw(context, program_state, portal.inv_screen_transform, material.override({is_filled : (draw_filled?1:0)}));
    }

    draw_player(context, program_state){
        this.shapes.box.draw(context, program_state,
            Mat4.translation(this.main_camera.pos[0], this.main_camera.pos[1], this.main_camera.pos[2])
                .times(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0))
                .times(Mat4.translation(0,-.5,0))
                .times(Mat4.scale(.2, .5, .2)),
            this.materials.phong.override({color: hex_color("#946afc")}));

        this.shapes.box.draw(context, program_state,
            Mat4.translation(this.main_camera.pos[0], this.main_camera.pos[1], this.main_camera.pos[2])
                .times(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0))
                .times(Mat4.rotation(this.main_camera.rot[1], 1, 0, 0))
                .times(Mat4.translation(0,.1,-.05))
                .times(Mat4.scale(.25, .25, .25)),
            this.materials.phong.override({color: hex_color("#e3ac88")}));
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

    update_portal_camera(portal, other, camera, iteration=1){
        // const trans = this.to_basis( other.top.cross(other.normal), other.top, other.normal, other.pos)
        //     .times(Mat4.inverse(this.to_basis( portal.top.cross(portal.normal.times(-1)), portal.top, portal.normal.times(-1), portal.pos)));

        let trans = Mat4.identity();

        for(let i = 0; i<iteration; ++i)
            trans = trans.times(portal.basis_transform);


        camera.look_dir = trans.times(this.main_camera.look_dir.to4(false)).to3();
        camera.top = trans.times(this.main_camera.top.to4(false)).to3();
        camera.pos = trans.times(this.main_camera.pos.to4(true)).to3();

        const look_at_point = camera.look_dir.plus(camera.pos);

        camera.transform = Mat4.look_at(camera.pos, look_at_point, camera.top);

        return trans;
    }

    get_oblique_projection_matrix(proj_mat, w_to_cam_mat, plane_normal, plane_origin){ // *orgasm*

        // cam space conversion
        let plane_normal_cam = w_to_cam_mat.times(plane_normal.to4(false));  // normal must lie inward w/ respect to view frustrum
        let plane_origin_cam = w_to_cam_mat.times(plane_origin.to4(true)); 

        // dist from orgin, < 0 if normal is correct
        let d = - plane_normal_cam.dot(plane_origin_cam);

        // clip plane vector
        let C = vec4(plane_normal_cam[0], plane_normal_cam[1], plane_normal_cam[2], d)

        let M = proj_mat; //original proj mat
        let M_ = new Mat4(); //new projmat

        // deep copy
        M_[0] = vec4(M[0][0], M[0][1], M[0][2], M[0][3]);
        M_[1] = vec4(M[1][0], M[1][1], M[1][2], M[1][3]);
        M_[2] = vec4(M[2][0], M[2][1], M[2][2], M[2][3]);
        M_[3] = vec4(M[3][0], M[3][1], M[3][2], M[3][3]);

        // see book
        let vcamera = vec4((Math.sign(C[0]) - M[0][2]) / M[0][0],
        (Math.sign(C[1]) - M[1][2]) / M[1][1],
        1.0 ,M[2][2] / M[2][3]);

        let m = - 1.0 / C.dot(vcamera);  

        M_[2][0] = m * C[0];
        M_[2][1] = m * C[1];
        M_[2][2] = m * C[2] + 1.0;
        M_[2][3] = m * C[3];

        return M_;
    }

    draw_orange_portal(context, program_state, t){
        this.update_portal_camera(this.portal_blue, this.portal_orange, this.portal_blue.camera, 1);
        
        if(this.portal_orange.normal.dot(this.main_camera.look_dir) > Math.sin(this.view_options.half_angle)
            ||  this.portal_orange.normal.dot(this.main_camera.pos) - this.portal_orange.dist_from_origin < 0){
            return;
        }

        this.update_portal_camera(this.portal_blue, this.portal_orange, this.portal_blue.camera_sec, 2);

        let skip_secondary = !this.draw_secondary_portals;

        if(!skip_secondary){
            // RENDER FROM BLUE PORTAL PERSPECTIVE, PASTE ONTO ORANGE PORTAL

            program_state.set_camera(this.portal_blue.camera_sec.transform);
            program_state.projection_transform = this.get_oblique_projection_matrix(this.view_options.proj_mat, 
                this.portal_blue.camera_sec.transform, this.portal_blue.normal, this.portal_blue.pos);

            this.draw_visible_scene(context, program_state, t);
            this.draw_player(context, program_state);
            this.draw_portal(context, program_state, this.portal_orange, this.textures.orange_portal_secondary.material, true);

            this.update_texture(this.textures.orange_portal_secondary, context);

            this.clear_buffer(context, this.textures.orange_portal_secondary);
        }



        // RENDER FROM BLUE PORTAL PERSPECTIVE, PASTE ONTO ORANGE PORTAL

        program_state.set_camera(this.portal_blue.camera.transform);
        program_state.projection_transform = this.get_oblique_projection_matrix(this.view_options.proj_mat, 
            this.portal_blue.camera.transform, this.portal_blue.normal, this.portal_blue.pos);

        this.draw_visible_scene(context, program_state, t);
        this.draw_player(context, program_state);
        this.draw_portal(context, program_state, this.portal_orange, this.textures.orange_portal_secondary.material, skip_secondary);

        this.update_texture(this.textures.orange_portal_primary, context);

        this.clear_buffer(context, this.textures.orange_portal_primary);

    }

    draw_blue_portal(context, program_state, t){
        this.update_portal_camera(this.portal_orange, this.portal_blue, this.portal_orange.camera, 1);

        if(this.portal_blue.normal.dot(this.main_camera.look_dir) > Math.sin(this.view_options.half_angle)
            ||  this.portal_blue.normal.dot(this.main_camera.pos) - this.portal_blue.dist_from_origin < 0){
            return;
        }

        this.update_portal_camera(this.portal_orange, this.portal_blue, this.portal_orange.camera_sec, 2);

        let skip_secondary = !this.draw_secondary_portals;
            
        if(!skip_secondary){

            // RENDER FROM ORANGE PORTAL PERSPECTIVE, PASTE ONTO BLUE PORTAL

            program_state.set_camera(this.portal_orange.camera_sec.transform);
            program_state.projection_transform = this.get_oblique_projection_matrix(this.view_options.proj_mat, 
                this.portal_orange.camera_sec.transform, this.portal_orange.normal, this.portal_orange.pos);

            this.draw_visible_scene(context, program_state, t);
            this.draw_player(context, program_state);
            this.draw_portal(context, program_state, this.portal_blue, this.textures.blue_portal_secondary.material, true);

            this.update_texture(this.textures.blue_portal_secondary, context);

            this.clear_buffer(context, this.textures.blue_portal_secondary);
        }
        


        // RENDER FROM ORANGE PORTAL PERSPECTIVE, PASTE ONTO BLUE PORTAL

        program_state.set_camera(this.portal_orange.camera.transform);
        program_state.projection_transform = this.get_oblique_projection_matrix(this.view_options.proj_mat, 
            this.portal_orange.camera.transform, this.portal_orange.normal, this.portal_orange.pos);

        this.draw_visible_scene(context, program_state, t);
        this.draw_player(context, program_state);
        this.draw_portal(context, program_state, this.portal_blue, this.textures.blue_portal_secondary.material, skip_secondary);

        this.update_texture(this.textures.blue_portal_primary, context);

        this.clear_buffer(context, this.textures.blue_portal_primary);

    }

    draw_portals_recursive(context, program_state, t){
        this.draw_orange_portal(context, program_state, t);
        this.draw_blue_portal(context, program_state, t);

    }

    shoot_projectile(type) {
        //limit shooting to every _ seconds
        if(this.t - this.last_fired < 1.0) return;
        this.last_fired = this.t;

        const color = (type == "orange") ? hex_color("FFA500") : hex_color("0059FF");

        this.projectiles.push({
            type: type,
            color: color,
            oldPos: this.main_camera.pos.copy(),
            newPos: this.main_camera.pos.copy(),
            time: this.t,
            dir: this.main_camera.look_dir.copy(),
            transform: null,
        });

        console.log("shoot ", this.projectiles);
    }

    update_projectiles(dt) {
        const origin = Mat4.identity();
        const projectile_scale = 0.1;
        const speed = 10.0;
        const life_span = 3.0;
        // const projectile_scale = 0.025 * Math.sin(6 * dt) + 0.14;
        for(let i = 0; i < this.projectiles.length; ++i) {

            let age = (this.t - this.projectiles[i].time);
 
            if(age > life_span) {
                console.log("projectile cancled = ", this.projectiles[i]);
                this.projectiles.splice(i, 1)
                i--;
                continue;
            }

            this.projectiles[i].oldPos = this.projectiles[i].newPos;

            this.projectiles[i].newPos = this.projectiles[i].oldPos.plus(this.projectiles[i].dir.times(dt * speed));

            this.projectiles[i].transform = origin
                .times(Mat4.translation(this.projectiles[i].newPos[0], this.projectiles[i].newPos[1], this.projectiles[i].newPos[2]))
                .times(Mat4.scale(projectile_scale, projectile_scale, projectile_scale))

            //projectiles disappear after 10 seconds
            
            // let projectile_body = new Body(this.shapes.sphere, this.materials.projectile,
            //     vec3(projectile_scale, projectile_scale, projectile_scale))
            // projectile_body.emplace(this.projectiles[i].transform, vec3(0,0,0), 0, vec3(0,0,0))
            // projectile_body.inverse = Mat4.inverse(this.projectiles[i].transform)

            let collision_wall = this.level.collision_point_to_point( this.projectiles[i].oldPos, this.projectiles[i].newPos);

            if(collision_wall != null){

                console.log("projectile collided: proj=", this.projectiles[i], "wall=",collision_wall)

                if(collision_wall.is_portal_wall && collision_wall.portal_on == ""){
                    console.log("collision wall is portal!, Placing RN!");

                    collision_wall.portal_on = this.projectiles[i].type;

                    if(this.projectiles[i].type === "blue") {
                        if(this.portal_blue.body != null) this.portal_blue.body.portal_on = "";
                        this.portal_blue.body = collision_wall;
                        this.portal_blue.pos = collision_wall.pos.plus(collision_wall.normal.times(0.1))
                        this.portal_blue.top = vec3(0,1,0); // make it so on floor there
                        this.portal_blue.normal = collision_wall.normal;
                        this.compute_portal_transform(this.portal_blue, this.portal_orange);
                        this.compute_portal_transform(this.portal_orange, this.portal_blue);

                    } else {
                        if(this.portal_orange.body != null) this.portal_orange.body.portal_on = "";
                        this.portal_orange.body = collision_wall;
                        this.portal_orange.pos = collision_wall.pos.plus(collision_wall.normal.times(0.1))
                        this.portal_orange.top = vec3(0,1,0); // make it so on floor there
                        this.portal_orange.normal = collision_wall.normal;
                        this.compute_portal_transform(this.portal_orange, this.portal_blue);
                        this.compute_portal_transform(this.portal_blue, this.portal_orange);
                    }
                }
                
                this.projectiles.splice(i, 1);
                    i--;
                    continue;

            }

            
            


            // for (let body of this.wall_bodies) {
            //     // Pass the two bodies and the collision shape to check_if_colliding():
            //     let co
            //     if (!projectile_body.check_if_colliding(body, this.collider))
            //         continue;

            //     if(this.projectiles[i].type == "blue" && this.portal_orange.body !== body) {
            //         this.portal_blue.body = body;
            //         this.portal_blue.pos = body.center.plus(body.normal.times(0.1))
            //         this.portal_blue.top = vec3(0,1,0);
            //         this.portal_blue.normal = body.normal;
            //         this.compute_portal_transform(this.portal_blue, this.portal_orange);
            //         this.compute_portal_transform(this.portal_orange, this.portal_blue);
            //     } else if(this.projectiles[i].type == "orange" && this.portal_blue.body !== body) {
            //         this.portal_orange.body = body;
            //         this.portal_orange.pos = body.center.plus(body.normal.times(0.1))
            //         this.portal_orange.top = vec3(0,1,0);
            //         this.portal_orange.normal = body.normal;
            //         this.compute_portal_transform(this.portal_blue, this.portal_orange);
            //         this.compute_portal_transform(this.portal_orange, this.portal_blue);
            //     }
            //     this.projectiles.splice(i, 1)
            //     i--;
            //     break;
            
        }
    }

    draw_projectiles(context, program_state) {
        for(let projectile of this.projectiles) {
            if(projectile.transform != null)
                this.shapes.sphere.draw(context, program_state, projectile.transform, this.materials.projectile.override({color: projectile.color}))
        }
    }

    jump() {
        //limit to single jump
        if(this.main_camera.pos[1] > 1.2) return;

        this.velocity_y = .5;
        this.main_camera.pos.add_by(vec3(0, 0.00001, 0))
    }

    update_y_pos(dt) {
        if(this.main_camera.pos[1] <= 1) {
            this.main_camera.pos[1] = 1;
            this.velocity_y = 0;
            return;
        }

        this.velocity_y -= dt;
        if(this.main_camera.pos[1] + this.velocity_y < 1) {
            this.main_camera.pos[1] = 1;
        } else {
            this.main_camera.pos.add_by(vec3(0, this.velocity_y, 0))
        }
    }

    display(context, program_state) {
        // ALL FRAME UPDATES

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        this.t = t;
        // const portal_lights = this.projectiles.map((projectile) => {
        //     //use size = 15 for more normal light effect
        //     const size = 100* Math.sin(6* t) + 10
        //     return new Light(projectile.newPos.to4(true), projectile.color, 15)\
        // })
        program_state.lights = [new Light(vec4(5, 5, 5, 1), color(1, 1, 1, 1), 10000) /*, ...portal_lights*/];

        this.update_y_pos(dt)
        this.update_main_camera(dt);
        this.update_projectiles(dt);

        this.draw_portals_recursive(context, program_state, t);


        //  RENDER FROM MAIN CAMERA
        program_state.set_camera(this.main_camera.transform);
        program_state.projection_transform = this.view_options.proj_mat;

            // this.shapes.box.draw(context, program_state, this.poop,
            // this.materials.phong.override({color: hex_color("#906000")}));

        this.draw_visible_scene(context, program_state, t);
        this.draw_portal(context, program_state, this.portal_blue, this.textures.blue_portal_primary.material);
        this.draw_portal(context, program_state, this.portal_orange, this.textures.orange_portal_primary.material);
    }

    // do_ground_calc(model_transform, draw_ceiling = false) {
    //     const k_max = draw_ceiling ? 2 : 1;

    //     let ground_transforms = [[],[]]
    //     for(let k = 0; k < k_max; k++) {
    //         const y = (k == 0 ? 0 : 8)

    //         for(let i = -5; i < 5; i++) {
    //             for(let j = -5; j < 5; j++) {
    //                 let temp = model_transform
    //                     .times(Mat4.translation(4*i, y, 4*j))
    //                     .times(Mat4.scale(2, 1, 2))
    //                     .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
    //                 ground_transforms[k].push(temp)
    //             }
    //         }
    //     }
    //     return ground_transforms
    // }

    // draw_walls(context, program_state) {
    //     for(let i = 0; i < this.wall_transforms.length; i++) {
    //         this.shapes.square.draw(context, program_state, this.wall_transforms[i], this.materials.wall_portal)
    //     }
    // }

    // draw_ground(context, program_state) {
    //     // const materials = [this.materials.wall_regular, this.materials.plastic]
    //     for(let i = 0; i < this.ground_transforms.length; i++) {
    //         for(let j = 0; j < this.ground_transforms[i].length; j++) {
    //             this.shapes.square.draw(context, program_state, this.ground_transforms[i][j], this.materials.wall_regular)
    //         }
    //     }
    // }

    // do_walls_calc(model_transform, height = 4) {
    //     const walls = {
    //         // returns [transform, normal]
    //         right: (i, j) => {
    //             return [model_transform
    //                 .times(Mat4.translation(18, j*2+1, i*2-1))
    //                 .times(Mat4.scale(1, 1, 1))
    //                 .times(Mat4.rotation(Math.PI/2, 0, 1, 0)), vec3(-1, 0, 0)]
    //         },
    //         left: (i, j) => {
    //             return [model_transform
    //                 .times(Mat4.translation(-22, j*2+1, i*2-1))
    //                 .times(Mat4.scale(1, 1, 1))
    //                 .times(Mat4.rotation(Math.PI/2, 0, 1, 0)), vec3(1, 0, 0)]
    //         },
    //         far: (i, j) => {
    //             return [model_transform
    //                 .times(Mat4.translation(i*2-1, j*2+1, -22))
    //                 .times(Mat4.scale(1, 1, 1))
    //                 .times(Mat4.rotation(Math.PI/2, 0, 0, 1)), vec3(0, 0, 1)]
    //         },
    //         near: (i, j) => {
    //             return [model_transform
    //                 .times(Mat4.translation(i*2-1, j*2+1, 18))
    //                 .times(Mat4.scale(1, 1, 1))
    //                 .times(Mat4.rotation(Math.PI/2, 0, 0, 1)), vec3(0, 0, -1)]
    //         }
    //     }

    //     let wall_transforms = []
    //     for(const [_, transform] of Object.entries(walls)) {
    //         for(let i = -10; i < 10; i++) {
    //             for(let j = 0; j < height; j++) {
    //                 const [temp_transform, normal] = transform(i, j)
    //                 const temp_body = new Body(this.shapes.square, this.materials.plastic, vec3(1, 1, 1))
    //                 temp_body.emplace(temp_transform, vec3(0,0,0), 0, vec3(0,0,0))
    //                 temp_body.inverse = Mat4.inverse(temp_body.drawn_location)
    //                 temp_body.normal = normal;

    //                 wall_transforms.push(temp_transform)
    //                 this.wall_bodies.push(temp_body)
    //             }
    //         }
    //     }
    //     return wall_transforms;
    // }

}


class Textured_Portal extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

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
        return this.shared_glsl_code() + `
            uniform sampler2D texture;
            uniform float screen_height;
            uniform float screen_width;
            uniform float distance_start;
            uniform float distance_end;
            uniform vec4 color;
            uniform int is_filled;

            void main(){                                              
                vec2 pos_in_screen = vec2(gl_FragCoord.x/screen_width, gl_FragCoord.y/screen_height);
                
                if(is_filled == 1){
                    gl_FragColor = color;
                    return;
                }

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
        context.uniform1i(gpu_addresses.is_filled, material.is_filled);

        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);

        if (material.texture && material.texture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i(gpu_addresses.texture, 0);
            // For this draw, use the texture image from correct the GPU buffer:
            material.texture.activate(context);
        }
    }
}