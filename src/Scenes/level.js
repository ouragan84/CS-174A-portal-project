import {tiny} from '../lib/common.js';
const {vec3, Mat4} = tiny;

export class Level{
    constructor(){
        this.x_width = 9;
        this.y_width = 5;
        this.z_width = 9;

        this.get_array();
        this.get_bodies();
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
    
        //little block for test:
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

        console.log(this.array);
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
                            is_portal: false
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
    
                                this.bodies[x][y][z][w].is_portal = this.array[x][y][z][w][2];
                    }
                }
            }
        }

        console.log("bodies", this.bodies);
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
                                this.bodies[x][y][z][w].is_portal? material_portal: material_no_portal);
                        }  
                        
                    }
                }
            }
        }
        
    }
}

