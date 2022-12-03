import {tiny} from '../lib/common.js';
const {vec3, Mat4} = tiny;

export class Level{
    constructor(){
        this.x_width = 9;
        this.y_width = 5;
        this.z_width = 9;

        this.get_array();
        this.get_bodies();

        // console.log("intersecrtion: ", this.get_point_plane_intersect(vec3(0,0,0), vec3(0,0,10), vec3(0,0,1), vec3(0,0,1)));

        // console.log( "result: ", this.collision_point_to_point(vec3(15,1,1), vec3(15,1,11), 1));
    }

    get_array(){

        const x_width = this.x_width;
        const y_width = this.y_width;
        const z_width = this.z_width;

        // empty
        this.array = new Array(x_width);

        for(let x = 0; x < x_width; ++x){
            this.array[x] = new Array(y_width);
            for(let y = 0; y < y_width; ++y){
                this.array[x][y] = new Array(z_width);
                for(let z = 0; z < z_width; ++z){
                    this.array[x][y][z] = new Array(3);
                    for(let w = 0; w < 3; ++w){
                        this.array[x][y][z][w] = [0];
                    }
                }
            } 
        }

        // floor + ceiling no portal
        for(let i = 0; i < x_width-1; ++ i){
            for(let j = 0; j < z_width-1; ++ j){
                this.array[i][0][j][1] = [1, 1, 0];
                this.array[i][y_width-1][j][1] = [1, 0, 0];
            }
        }
    
        // constant x walls yes portal
        for(let i = 0; i < y_width-1; ++ i){
            for(let j = 0; j < z_width-1; ++ j){
                this.array[0][i][j][0] = [1, 1, 1];
                this.array[x_width-1][i][j][0] = [1, 0, 1];
            }
        }
    
        // constant z walls yes portal
        for(let i = 0; i < x_width-1; ++ i){
            for(let j = 0; j < y_width-1; ++ j){
                this.array[i][j][0][2] = [1, 1, 1];
                this.array[i][j][z_width-1][2] = [1, 0, 1];
            }
        }
    
        //little offset in wall for test:
        this.array[8][0][2][0] = [0, 0, 0];
        this.array[7][0][2][1] = [0, 0, 0];
        this.array[8][0][3][0] = [0, 0, 0];
        this.array[7][0][3][1] = [0, 0, 0];
        this.array[7][0][2][0] = [1, 0, 0];
        this.array[7][0][3][0] = [1, 0, 0];
        this.array[7][1][3][1] = [1, 0, 0];
        this.array[7][0][2][2] = [1, 0, 1];
        this.array[7][0][4][2] = [1, 1, 1];
        this.array[7][1][2][1] = [1, 0, 0];

        this.array[0][0][4][1] = [0, 0, 0];
        this.array[1][0][4][1] = [0, 0, 0];
        this.array[0][4][4][1] = [0, 0, 0];
        this.array[1][4][4][1] = [0, 0, 0];
        this.array[0][0][4][0] = [0, 0, 0];
        this.array[0][1][4][0] = [0, 0, 0];
        this.array[0][2][4][0] = [0, 0, 0];
        this.array[0][3][4][0] = [0, 0, 0];

        this.array[0][0][4][2] = [1, 0, 1];
        this.array[0][1][4][2] = [1, 0, 1];
        this.array[0][2][4][2] = [1, 0, 1];
        this.array[0][3][4][2] = [1, 0, 1];
        this.array[1][0][4][2] = [1, 0, 1];
        this.array[1][1][4][2] = [1, 0, 1];
        this.array[1][2][4][2] = [1, 0, 1];
        this.array[1][3][4][2] = [1, 0, 1];

        this.array[0][0][5][2] = [1, 1, 1];
        this.array[0][1][5][2] = [1, 1, 1];
        this.array[0][2][5][2] = [1, 1, 1];
        this.array[0][3][5][2] = [1, 1, 1];
        this.array[1][0][5][2] = [1, 1, 1];
        this.array[1][1][5][2] = [1, 1, 1];
        this.array[1][2][5][2] = [1, 1, 1];
        this.array[1][3][5][2] = [1, 1, 1];

        this.array[2][0][4][0] = [1, 1, 0];
        this.array[2][1][4][0] = [1, 1, 0];
        this.array[2][2][4][0] = [1, 1, 0];
        this.array[2][3][4][0] = [1, 1, 0];





        // console.log(this.array);
    }

    // array[x][y][z][0=normal in x-dir, 1=normal in y-dir, 2=normal in z-dir]
    // = { 1 = is_wall, 1 = normal in positive dir, 1 = can shoot portal}
    
    get_bodies(){

        const x_width = this.x_width;
        const y_width = this.y_width;
        const z_width = this.z_width;

        // empty
        this.bodies = new Array(x_width);

        for(let x = 0; x < x_width; ++x){
            this.bodies[x] = new Array(y_width);
            for(let y = 0; y < y_width; ++y){
                this.bodies[x][y] = new Array(z_width);
                for(let z = 0; z < z_width; ++z){
                    this.bodies[x][y][z] = new Array(3);
                    for(let w = 0; w < 3; ++w){
                        this.bodies[x][y][z][w] = {
                            draw: false,
                            normal: null,
                            pos: null,
                            model_trans: null,
                            is_portal_wall: false,
                            portal_on: ""
                        }
                    }
                }
            } 
        }
    
        for(let x = 0; x < x_width; ++x){
            for(let y = 0; y < y_width; ++y){
                for(let z = 0; z < z_width; ++z){
                    for(let w = 0; w < 3; ++w){
                        if(this.array[x][y][z][w][0] == 0){
                            // console.log("poop");
                            continue;
                        }
                            
                        this.bodies[x][y][z][w].draw = true;
    
                        this.bodies[x][y][z][w].pos = vec3(2*x + (w==0?0:1), 2*y + (w==1?0:1), 2*z + (w==2?0:1));
                        const dir = this.array[x][y][z][w][1]?1:-1;
                        this.bodies[x][y][z][w].normal = vec3((w==0?dir:0), (w==1?dir:0), (w==2?dir:0));
    
                        this.bodies[x][y][z][w].model_trans = 
                            Mat4.translation(this.bodies[x][y][z][w].pos[0], this.bodies[x][y][z][w].pos[1], this.bodies[x][y][z][w].pos[2])
                                .times(
                                    (w==0)? Mat4.rotation(Math.PI/2, 0, 1, 0)
                                    :(w==1)? Mat4.rotation(Math.PI/2, 1, 0, 0)
                                    : Mat4.identity()
                                );
    
                                this.bodies[x][y][z][w].is_portal_wall = this.array[x][y][z][w][2]==1?true:false;
                    }
                }
            }
        }

        // console.log("bodies", this.bodies);
    }
    
    draw_walls(context, program_state, material_portal, material_no_portal, shape){

        const x_width = this.x_width;
        const y_width = this.y_width;
        const z_width = this.z_width;

        for(let x = 0; x < x_width; ++x){
            for(let y = 0; y < y_width; ++y){
                for(let z = 0; z < z_width; ++z){
                    for(let w = 0; w < 3; ++w){
                        if(this.bodies[x][y][z][w].draw){
                            shape.draw(context, program_state, this.bodies[x][y][z][w].model_trans, 
                                this.bodies[x][y][z][w].is_portal_wall? material_portal: material_no_portal);
                        }  
                        
                    }
                }
            }
        }
        
    }

    get_wall(x, y, z, w){
        if(x < 0 || x >= this.x_width || y < 0 || y >= this.y_width || z < 0 || z >= this.z_width){
            // console.error("got out of bound wall ",x,y,z,w);
            return null;
        }
        return this.bodies[x][y][z][w];
    }

    collision_point_to_point(start, finish){
        let cc = vec3(Math.floor(start[0]/2), Math.floor(start[1]/2), Math.floor(start[2]/2));

        // console.log("\n ======================== ");
        // console.log( "start: " + start.to_string(), "finish: " + finish.to_string() );
        // console.log( "cc: " + cc.to_string());

        if(cc[0] >= this.x_width || cc[1] >= this.y_width || cc[2] >= this.z_width ) return null;

        let v = finish.minus(start);

        // console.log( "v: " + v.to_string());

        let res = this.get_collision_with_cube(start, v, cc.times(2).plus(vec3(1,1,1)), 0.01);

        // console.log( "res: ", res);

        if(res == null) return null;

        switch(res.face){
            case 1:{
                let body = this.get_wall(cc[0]+1, cc[1], cc[2], 0);
                // console.log("choose face 1 with body ", body);
                if(body != null && body.draw)
                    return body;
                break;
            }
            case 2:{
                let body = this.get_wall(cc[0], cc[1], cc[2], 0);
                // console.log("choose face 2 with body ", body);
                if(body != null && body.draw)
                    return body;
                break;
            }
            case 3:{
                let body = this.get_wall(cc[0], cc[1]+1, cc[2], 1);
                // console.log("choose face 3 with body ", body);
                if(body != null && body.draw)
                    return body;
                break;
            }
            case 4:{
                let body = this.get_wall(cc[0], cc[1], cc[2], 1);
                // console.log("choose face 4 with body ", body);
                if(body != null && body.draw)
                    return body;
                break;
            }
            case 5:{
                let body = this.get_wall(cc[0], cc[1], cc[2]+1, 2);
                // console.log("choose face 5 with body ", body);
                if(body != null && body.draw)
                    return body;
                break;
            }
            case 6:{
                let body = this.get_wall(cc[0], cc[1], cc[2], 2);
                // console.log("choose face 6 with body ", body);
                if(body != null && body.draw)
                    return body;
                break;
            }
        }

        let new_start = res.intersection.plus(v.normalized().times(0.01));

        // console.log("the face was not a wall, new one with new start: ", new_start);

        return this.collision_point_to_point(new_start, finish);
    }

    get_collision_with_cube(start, v, offset, err){
        // do collision with 6 sides return side and intersectuionb

        let p = start.minus(offset);

        let int;

        int = this.check_collision_bound(p, v, vec3(1,0,0), vec3(1,0,0), 1-err, 1+err, -1, 1, -1, 1);
        if(int != null) return {face:1, intersection: int.plus(offset)};

        int = this.check_collision_bound(p, v, vec3(-1,0,0), vec3(-1,0,0), -1-err, -1+err, -1, 1, -1, 1);
        if(int != null) return {face:2, intersection: int.plus(offset)};

        int = this.check_collision_bound(p, v, vec3(0,1,0), vec3(0,1,0), -1, 1, 1-err, 1+err, -1, 1);
        if(int != null) return {face:3, intersection: int.plus(offset)};

        int = this.check_collision_bound(p, v, vec3(0,-1,0), vec3(0,-1,0), -1, 1, -1, -1, -1-err, 1+err);
        if(int != null) return {face:4, intersection: int.plus(offset)};

        int = this.check_collision_bound(p, v, vec3(0,0,1), vec3(0,0,1), -1, 1, -1, 1, 1-err, 1+err);
        if(int != null) return {face:5, intersection: int.plus(offset)};

        int = this.check_collision_bound(p, v, vec3(0,0,-1), vec3(0,0,-1), -1, 1, -1, 1, -1-err, -1+err);
        if(int != null) return {face:6, intersection: int.plus(offset)};

        return null;
    }

    check_collision_bound(p, v, o, n, x_min, x_max, y_min, y_max, z_min, z_max){
        

        // console.log("  - getting intersection between \np="+p.to_string()+", v="+v.to_string()+"\n, o="+o.to_string()+", n="+n.to_string());
        let int = this.get_point_plane_intersect(p, v, o, n);

        if(int == null) return null;

        // console.log("     - intersection not null = " + int.to_string());

        if( int[0] < x_min || int[0] > x_max ) return null;
        if( int[1] < y_min || int[1] > y_max ) return null;
        if( int[2] < z_min || int[2] > z_max ) return null;

        // console.log("     - intersection is within square!" );

        return int;
    }

    // point vector plane_origin normal
    get_point_plane_intersect(p, v, o, n){

        if(Math.abs(v.dot(n)) < 0.0001)
            return null; // no intersection

        // console.log("      - vector does cross plane");

        const d = o.dot(n);

        const a = vec3(Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2]));

        const i = a[0]>a[1]?(a[0]>a[2]?0:2):(a[1]>a[2]?1:2);

        const t = (d/n[i] - p[i])/v[i];

        // console.log("      - d = " + d + ", t = " + t + ", i = " + i );

        if(t>1 || t<0) 
            return null; // vector too far

        const inter = p.plus(v.times(t));

        // console.log("      - inter = " + inter.to_string());

        return inter;
    }


}

