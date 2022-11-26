import {defs, tiny} from '../lib/common.js';
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
            portal_around: new defs.Cylindrical_Tube(3,24)
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
                // earth: new Material(new Fake_Bump_Map(1), {ambient: .5, texture: new Texture("src/assets/earth.gif")}),

                wall_portal: new Material(new defs.Textured_Phong(), {ambient: .8, diffusivity: .5, specularity:0, texture: new Texture("src/assets/portal_wall.png")}),

                wall_regular: new Material(new defs.Textured_Phong(), {ambient: .8, diffusivity: .5, specularity:0, texture: new Texture("src/assets/regular_wall.png")}),

                phong: new Material(new Phong_Shader(), {ambient: .5, diffusivity:.5, specularity:0}),

                portal_around: new Material(new Phong_Shader(), {ambient: 1, diffusivity:0, specularity:0}),

                plastic: new Material(new defs.Phong_Shader(),
                    {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),

                // default: new Material(new defs.Phong_Shader(),
                //     {ambient: 1, diffusivity: 0.1, specularity: 0.1, color: hex_color("#6da8e3")}),

                projectile: new Material(new defs.Phong_Shader(), {ambient: 1, diffusivity: 0, specularity: 1.0}) //probably change
        }

        // this.spin = 0;
        // this.cube_1 = Mat4.translation(14 , 1.1, 14);

        this.main_camera = {
            pos: vec3(5, 1, 5),
            top: vec3(0, 1, 0),
            rot: vec3(0, 0, 0),
            look_dir: null,
            transform: null,
            
            pos_input: vec3(0,0,0),
            rot_input: vec3(0,0,0),
            velocity: vec3(0,0,0),
            walking_speed: 4.0,
            air_swerve_speed: 5.0,
            turning_speed: 0.8 * Math.PI,
            gravity_factor: 9.8,
            capped_falling_speed: 7.5,
            jumping_speed: 7.5,
            portal_penetrating: null,

            height_on_bottom: 1.0,
            height_on_top: 0.3,
            side_width: 0.2,
            collision_center: null,
            widths: null,
            total_height: null
        }

        this.main_camera.total_height = this.main_camera.height_on_bottom+this.main_camera.height_on_top;
        this.main_camera.collision_center = vec3(0,(this.main_camera.height_on_top-this.main_camera.height_on_bottom)/2,0);
        this.main_camera.widths = vec3(this.main_camera.side_width, this.main_camera.total_height/2, this.main_camera.side_width);

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
        // this.collider = {intersect_test: Body.intersect_cube, points: new defs.Subdivision_Sphere(4), leeway: .3}

        this.compute_portal_transform( this.portal_blue,  this.portal_orange);
        this.compute_portal_transform( this.portal_orange, this.portal_blue);

        // this.wall_transforms = this.do_walls_calc(Mat4.identity())
        // this.ground_transforms = this.do_ground_calc(Mat4.identity(), true)

        this.draw_secondary_portals = true;

        // this.wall_bodies = level.get_wall_bodies(level.array);

        this.level = new Level();
        this.level.bodies[2][0][0][2].is_portal_wall = true;
        this.level.bodies[2][0][0][2].portal_on = "blue";
        this.portal_blue.body = this.level.bodies[2][0][0][2];
        
        this.level.bodies[0][0][2][0].is_portal_wall = true;
        this.level.bodies[0][0][2][0].portal_on = "orange";
        this.portal_orange.body = this.level.bodies[0][0][2][0];

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
        this.key_triggered_button("Left Click (blue)", ["["], () => this.shoot_projectile("blue"))
        this.key_triggered_button("Right Click (orange)", ["]"], () => this.shoot_projectile("orange"))

        this.new_line();

        this.key_triggered_button("Jump", [" "], () => this.jump());
        this.new_line();
        this.key_triggered_button("Forward", ["w"], () => this.move_player(2,-1), undefined, () => this.move_player(2,0));
        this.key_triggered_button("Back", ["s"], () => this.move_player(2,1), undefined, () => this.move_player(2,0));
        this.new_line();
        this.key_triggered_button("Left", ["a"], () => this.move_player(0,-1), undefined, () => this.move_player(0,0));
        this.key_triggered_button("Right", ["d"], () => this.move_player(0,1), undefined, () => this.move_player(0,0));
        this.new_line();
        //this.key_triggered_button("Down", ["z"], () => this.main_camera.pos_dir[1] = -1, undefined, () => this.main_camera.pos_dir[1] = 0);

        this.new_line();
        this.key_triggered_button("Look Left", ["q"], () => this.rotate_player(0,1), undefined, () => this.rotate_player(0,0));
        this.key_triggered_button("Look Right", ["e"], () => this.rotate_player(0,-1), undefined, () => this.rotate_player(0,0));
        this.new_line();
        this.key_triggered_button("Look Up", ["r"], () => this.rotate_player(1,1), undefined, () => this.rotate_player(1,0));
        this.key_triggered_button("Look Down", ["f"], () => this.rotate_player(1,-1), undefined, () => this.rotate_player(1,0));

        this.new_line();
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
        this.draw_projectiles(context, program_state);

        this.level.draw_walls(context, program_state, this.materials.wall_portal, this.materials.wall_regular, this.shapes.square);
    }

    draw_portal(context, program_state, portal, material, draw_filled=false){
        this.shapes.portal.draw(context, program_state, portal.inv_screen_transform, material.override({is_filled : (draw_filled?1:0)}));
        this.shapes.portal_around.draw(context, program_state, portal.inv_screen_transform.times(Mat4.scale(1.01,1.01,1.01)), this.materials.portal_around.override({color: material.color}));
    }

    draw_player(context, program_state){
        // body
        this.shapes.box.draw(context, program_state,
            Mat4.translation(this.main_camera.pos[0], this.main_camera.pos[1], this.main_camera.pos[2])
                .times(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0))
                .times(Mat4.translation(0,-.5,0))
                .times(Mat4.scale(.2, .5, .2)),
            this.materials.phong.override({color: hex_color("#946afc")}));

        // head
        this.shapes.box.draw(context, program_state,
            Mat4.translation(this.main_camera.pos[0], this.main_camera.pos[1], this.main_camera.pos[2])
                .times(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0))
                .times(Mat4.rotation(this.main_camera.rot[1], 1, 0, 0))
                .times(Mat4.translation(0,.1,-.04))
                .times(Mat4.scale(.25, .25, .25)),
            this.materials.phong.override({color: hex_color("#e3ac88")}));
    }

    jump() {
        //limit to single jump
        if(!this.main_camera.is_grounded) return;

        this.main_camera.velocity[1] = this.main_camera.jumping_speed;
        // this.main_camera.pos.add_by(vec3(0, 0.00001, 0))
    }

    move_player(coord, amount){
        this.main_camera.pos_input[coord] = amount;
    }

    rotate_player(coord, amount){
        this.main_camera.rot_input[coord] = amount;
    }

    get_player_side_collision(dir, center, widths, err_out = 0.01, err_in = 0.39, shrink_err=0.01){
        let points = [];
        let candidate = null;
        let is_colliding_with_single_portal = true;

        if(Math.abs(dir[0]) > .999){
            points.push(center.plus(vec3(0,widths[1]-shrink_err,widths[2]-shrink_err)));
            points.push(center.plus(vec3(0,-widths[1]+shrink_err,widths[2]-shrink_err)));
            points.push(center.plus(vec3(0,widths[1]-shrink_err,-widths[2]+shrink_err)));
            points.push(center.plus(vec3(0,-widths[1]+shrink_err,-widths[2]+shrink_err)));
        }

        if(Math.abs(dir[1]) > .999){
            points.push(center.plus(vec3(widths[0]-shrink_err,0,widths[2]-shrink_err)));
            points.push(center.plus(vec3(-widths[0]+shrink_err,0,widths[2]-shrink_err)));
            points.push(center.plus(vec3(widths[0]-shrink_err,0,-widths[2]+shrink_err)));
            points.push(center.plus(vec3(-widths[0]+shrink_err,0,-widths[2]+shrink_err)));
        }

        if(Math.abs(dir[2]) > .999){
            points.push(center.plus(vec3(widths[0]-shrink_err,widths[1]-shrink_err,0)));
            points.push(center.plus(vec3(-widths[0]+shrink_err,widths[1]-shrink_err,0)));
            points.push(center.plus(vec3(widths[0]-shrink_err,-widths[1]+shrink_err,0)));
            points.push(center.plus(vec3(-widths[0]+shrink_err,-widths[1]+shrink_err,0)));
        }
        
        for(let point of points){
            const collide = this.level.collision_point_to_point(point.minus(dir.times(err_in)), point.plus(dir.times(err_out)));
           
            if(collide == null) {is_colliding_with_single_portal = false; continue;}
            if(candidate == null) candidate = collide;
            if(!collide.is_portal_wall || (candidate.portal_on !== collide.portal_on)) 
                is_colliding_with_single_portal = false;
        }

        return {wall: candidate, is_portal: (is_colliding_with_single_portal && candidate.is_portal_wall)};
        
    }

    update_player_rotation(dt){
        this.main_camera.rot.add_by(this.main_camera.rot_input.times(dt * this.main_camera.turning_speed));
        this.main_camera.rot[0] = this.main_camera.rot[0]%(2.0*Math.PI); 
        this.main_camera.rot[1] = (this.main_camera.rot[1] < -Math.PI/2 + 0.01)? -Math.PI/2 + 0.01 : 
                            (this.main_camera.rot[1] > Math.PI/2 - 0.01)? Math.PI/2 - 0.01 : this.main_camera.rot[1];
    }

    update_player_position(dt){
        this.main_camera.pos.add_by(this.main_camera.velocity.times(dt));
    }

    update_player_vertical_veolcity(dt){

        const col_cent = this.main_camera.pos.plus(this.main_camera.collision_center);

        // console.log("col_cent ", col_cent)

        const floor_collide = this.get_player_side_collision(vec3(0,-1,0), 
            col_cent.plus(vec3(0,-this.main_camera.widths[1],0)), this.main_camera.widths, 0.01, 0.75);
        this.main_camera.is_grounded = floor_collide.wall != null;

        const ceil_collide = this.get_player_side_collision(vec3(0,1,0), 
        col_cent.plus(vec3(0,this.main_camera.widths[1],0)), this.main_camera.widths, 0.01, 0.75);
        const is_ceiled = ceil_collide.wall != null;

        if(this.main_camera.is_grounded && this.main_camera.velocity[1] <= 0){
            // were already on the floor or landed on the floor
            this.main_camera.pos[1] = floor_collide.wall.pos[1] + this.main_camera.height_on_bottom;
            this.main_camera.velocity[1] = 0;
        }else if(is_ceiled && this.main_camera.velocity[1] > 0){
            // landed on the ceiling
            this.main_camera.pos[1] = ceil_collide.wall.pos[1] - this.main_camera.height_on_top;
            this.main_camera.velocity[1] = 0;
        }else{
            // otherwise go down
            this.main_camera.velocity[1] -= dt * this.main_camera.gravity_factor;

            if(this.main_camera.velocity[1] < 0){
                // cap falling velocity
                this.main_camera.velocity[1] = Math.max(this.main_camera.velocity[1], -this.main_camera.capped_falling_speed);
            }
        }

    }

    update_player_velocity(dt){
        this.update_player_vertical_veolcity(dt);

        // const speed = this.main_camera.is_grounded? this.main_camera.walking_speed : this.main_camera.air_swerve_speed;

        if(this.main_camera.is_grounded){
            this.main_camera.velocity[0] = ( Math.cos(this.main_camera.rot[0]) * this.main_camera.pos_input[0]
                + Math.sin(this.main_camera.rot[0]) * this.main_camera.pos_input[2]) * this.main_camera.walking_speed;

            this.main_camera.velocity[2] = ( Math.cos(this.main_camera.rot[0]) * this.main_camera.pos_input[2]
                - Math.sin(this.main_camera.rot[0]) * this.main_camera.pos_input[0]) * this.main_camera.walking_speed;
        }else{
            this.main_camera.velocity[0] += dt * ( Math.cos(this.main_camera.rot[0]) * this.main_camera.pos_input[0]
                + Math.sin(this.main_camera.rot[0]) * this.main_camera.pos_input[2]) * this.main_camera.air_swerve_speed;
            this.main_camera.velocity[2] += dt * ( Math.cos(this.main_camera.rot[0]) * this.main_camera.pos_input[2]
                - Math.sin(this.main_camera.rot[0]) * this.main_camera.pos_input[0]) * this.main_camera.air_swerve_speed;

            if(this.main_camera.velocity[0] > this.main_camera.walking_speed) this.main_camera.velocity[0] = this.main_camera.walking_speed;
            if(this.main_camera.velocity[0] < -this.main_camera.walking_speed) this.main_camera.velocity[0] = -this.main_camera.walking_speed;
            if(this.main_camera.velocity[2] > this.main_camera.walking_speed) this.main_camera.velocity[2] = this.main_camera.walking_speed;
            if(this.main_camera.velocity[2] < -this.main_camera.walking_speed) this.main_camera.velocity[2] = -this.main_camera.walking_speed;
        }
        
    }

    handle_player_collision(){

        let col_cent = this.main_camera.pos.plus(this.main_camera.collision_center);
        
        if(this.main_camera.velocity[0] > 0){

            const positive_x_collide = this.get_player_side_collision(vec3(1,0,0), 
            col_cent.plus(vec3(this.main_camera.widths[0],0,0)), this.main_camera.widths);

            if(positive_x_collide.wall != null && Math.sign(positive_x_collide.wall.normal[0]) < 0){
                // collision with wall
                this.main_camera.pos[0] = positive_x_collide.wall.pos[0] - this.main_camera.side_width;
                this.main_camera.velocity[0] = 0;
                col_cent = this.main_camera.pos.plus(this.main_camera.collision_center);//update for z
            }
        }else if(this.main_camera.velocity[0] < 0){

            const negative_x_collide = this.get_player_side_collision(vec3(-1,0,0), 
                col_cent.plus(vec3(-this.main_camera.widths[0],0,0)), this.main_camera.widths);

            if(negative_x_collide.wall != null && Math.sign(negative_x_collide.wall.normal[0]) > 0){
                // collision with wall
                this.main_camera.pos[0] = negative_x_collide.wall.pos[0] + this.main_camera.side_width;
                this.main_camera.velocity[0] = 0;
                col_cent = this.main_camera.pos.plus(this.main_camera.collision_center); //update for z
            }
        }

        
        if(this.main_camera.velocity[2] > 0){
            
            const positive_z_collide = this.get_player_side_collision(vec3(0,0,1), 
                col_cent.plus(vec3(0,0,this.main_camera.widths[2])), this.main_camera.widths);

            if(positive_z_collide.wall != null && Math.sign(positive_z_collide.wall.normal[2]) < 0){
                // collision with wall
                this.main_camera.pos[2] = positive_z_collide.wall.pos[2] - this.main_camera.side_width;
                this.main_camera.velocity[2] = 0;
            }
        }else if(this.main_camera.velocity[2] < 0){

            const negative_z_collide = this.get_player_side_collision(vec3(0,0,-1), 
                col_cent.plus(vec3(0,0,-this.main_camera.widths[2])), this.main_camera.widths);

            if(negative_z_collide.wall != null && Math.sign(negative_z_collide.wall.normal[2]) > 0){
                // collision with wall
                this.main_camera.pos[2] = negative_z_collide.wall.pos[2] + this.main_camera.side_width;
                this.main_camera.velocity[2] = 0;
            }
        }

    }

    update_main_camera(dt){

        this.update_player_rotation(dt);

        this.update_player_velocity(dt);

        this.update_player_position(dt);

        this.handle_player_collision();


        // get camera attributes

        this.main_camera.look_dir = Mat4.identity()
            .times(Mat4.rotation(this.main_camera.rot[0], 0, 1, 0))
            .times(Mat4.rotation(this.main_camera.rot[1], 1, 0, 0))
            .times(Mat4.translation(0, 0, -1))
            .times(vec4(0,0,0,1)).to3();

        const look_at_point = this.main_camera.look_dir.plus(this.main_camera.pos);

        // console.log(this.main_camera.pos.to_string(), this.main_camera.velocity.to_string())
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

    get_oblique_projection_matrix(proj_mat, w_to_cam_mat, plane_normal, plane_origin){

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

    draw_projectiles(context, program_state) {
        for(let projectile of this.projectiles) {
            if(projectile.transform != null)
                this.shapes.sphere.draw(context, program_state, projectile.transform, this.materials.projectile.override({color: projectile.color}))
        }
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

        // console.log("shoot ", this.projectiles);
    }

    update_projectiles(dt) {
        const origin = Mat4.identity();
        const projectile_scale = 0.1;
        const speed = 15.0;
        const life_span = 3.0;
        // const projectile_scale = 0.025 * Math.sin(6 * dt) + 0.14;
        for(let i = 0; i < this.projectiles.length; ++i) {

            let age = (this.t - this.projectiles[i].time);
 
            if(age > life_span) {
                // console.log("projectile cancled = ", this.projectiles[i]);
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

                // console.log("projectile collided: proj=", this.projectiles[i], "wall=",collision_wall)

                if(collision_wall.is_portal_wall && collision_wall.portal_on == ""){
                    // console.log("collision wall is portal!, Placing RN!");

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
        }
    }

    display(context, program_state) {
        // ALL FRAME UPDATES

        const t = program_state.animation_time / 1000, dt = Math.min(program_state.animation_delta_time / 1000, 0.1);
        this.t = t;
        // const portal_lights = this.projectiles.map((projectile) => {
        //     //use size = 15 for more normal light effect
        //     const size = 100* Math.sin(6* t) + 10
        //     return new Light(projectile.newPos.to4(true), projectile.color, 15)\
        // })
        program_state.lights = [new Light(vec4(5, 5, 5, 1), color(1, 1, 1, 1), 10000) /*, ...portal_lights*/];

        // this.update_y_pos(dt)
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

}


class Textured_Portal extends Shader {

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
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
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

        material = Object.assign({}, {}, material);
        context.uniform1f(gpu_addresses.screen_height, material.screen_height);
        context.uniform1f(gpu_addresses.screen_width, material.screen_width);
        context.uniform4fv(gpu_addresses.color, material.color);
        context.uniform1f(gpu_addresses.distance_start, material.distance_start);
        context.uniform1f(gpu_addresses.distance_end, material.distance_end);
        context.uniform1i(gpu_addresses.is_filled, material.is_filled);

        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);

        if (material.texture && material.texture.ready) {
            context.uniform1i(gpu_addresses.texture, 0);
            material.texture.activate(context);
        }
    }
}