// Apex Dino: Realistic Pixelated Prehistoric Runner
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 360;
const GROUND_Y = 280;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.sprites = window.spriteEngine;
        this.audio = window.soundEngine;

        // Game State
        this.state = 'TITLE'; // 'TITLE', 'RUNNING', 'GAMEOVER'
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('apex_dino_hiscore') || '0', 10);
        this.distance = 0;
        this.baseSpeed = 4.2; // Relaxed, approachable starting speed
        this.currentSpeed = this.baseSpeed;
        this.maxSpeed = 12.0; // Scaled ceiling
        this.speedMultiplier = 1.0;

        // Camera & Juice
        this.shakeTime = 0;
        this.shakeMagnitude = 0;
        this.timeScale = 1.0;

        // Fixed Timestep Engine (Eliminates high-refresh rate jitter & speed bugs)
        this.stepSize = 1000 / 60; // 60 ticks per sec
        this.accumulator = 0;

        // Player
        this.dino = {
            x: 80,
            y: GROUND_Y - 40,
            w: 48,
            h: 40,
            vy: 0,
            gravity: 0.65,
            jumpForce: -12.4,
            isGrounded: true,
            isDucking: false,
            isRoaring: false,
            roarTimer: 0,
            roarCooldown: 0,
            maxRoarCooldown: 360, // ~6 seconds
            frenzyTimer: 0,       // invulnerability meat boost
            animFrame: 0,
            animTimer: 0,
            coyoteTimer: 0,
            jumpBuffer: 0,
            dustTimer: 0
        };

        // Entities & World
        this.obstacles = [];
        this.pickups = [];
        this.particles = [];
        this.ambientParticles = [];
        this.shockwaves = [];
        this.spawnTimer = 0;
        this.nextSpawnDistance = 300;

        // Parallax Layers
        this.bgLayers = [
            { speed: 0.1, x: 0 }, // Far volcanoes
            { speed: 0.3, x: 0 }, // Mountains
            { speed: 0.6, x: 0 }, // Jungle silhouettes
            { speed: 1.0, x: 0 }  // Foreground Ground Strata
        ];

        // Biome / Day-Night System
        this.dayCycle = 0; // 0 to 1
        this.biome = 'BADLANDS'; // 'BADLANDS', 'JUNGLE', 'VOLCANO'

        // Input
        this.keys = {
            jump: false,
            duck: false,
            roar: false
        };

        this.initInput();
        this.initAmbientParticles();

        // Loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                if (this.state === 'TITLE' || this.state === 'GAMEOVER') {
                    this.restart();
                } else {
                    this.keys.jump = true;
                    this.dino.jumpBuffer = 7; // frames buffer
                }
                e.preventDefault();
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.keys.duck = true;
                e.preventDefault();
            } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') {
                this.triggerRoar();
                e.preventDefault();
            } else if (e.code === 'KeyM') {
                const muted = this.audio.toggleMute();
                this.showNotice(muted ? 'AUDIO MUTED' : 'AUDIO ON');
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.keys.jump = false;
                // Variable jump height cut
                if (this.dino.vy < -4) {
                    this.dino.vy = -4;
                }
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.keys.duck = false;
            }
        });

        // Touch & Mouse Support
        this.canvas.addEventListener('pointerdown', (e) => {
            this.audio.init();
            const rect = this.canvas.getBoundingClientRect();
            const touchY = e.clientY - rect.top;
            const touchX = e.clientX - rect.left;

            if (this.state === 'TITLE' || this.state === 'GAMEOVER') {
                this.restart();
                return;
            }

            // Check if touch is on lower third or roar icon
            if (touchX > rect.width * 0.75 && touchY > rect.height * 0.7) {
                this.triggerRoar();
            } else if (touchY > rect.height * 0.65) {
                this.keys.duck = true;
            } else {
                this.keys.jump = true;
                this.dino.jumpBuffer = 7;
            }
        });

        window.addEventListener('pointerup', () => {
            this.keys.jump = false;
            this.keys.duck = false;
            if (this.dino.vy < -4) {
                this.dino.vy = -4;
            }
        });
    }

    initAmbientParticles() {
        for (let i = 0; i < 45; i++) {
            this.ambientParticles.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                size: Math.random() * 2 + 1,
                vx: -(Math.random() * 1.5 + 0.5),
                vy: (Math.random() * 0.4 - 0.2),
                alpha: Math.random() * 0.6 + 0.2,
                type: 'dust'
            });
        }
    }

    restart() {
        this.audio.init();
        this.state = 'RUNNING';
        this.score = 0;
        this.distance = 0;
        this.currentSpeed = this.baseSpeed;
        this.dino.y = GROUND_Y - 40;
        this.dino.vy = 0;
        this.dino.isGrounded = true;
        this.dino.isDucking = false;
        this.dino.isRoaring = false;
        this.dino.roarCooldown = 0;
        this.dino.frenzyTimer = 0;
        this.obstacles = [];
        this.pickups = [];
        this.particles = [];
        this.shockwaves = [];
        this.nextSpawnDistance = 220;
        this.timeScale = 1.0;
    }

    triggerRoar() {
        if (this.state !== 'RUNNING' || this.dino.roarCooldown > 0) return;
        this.dino.isRoaring = true;
        this.dino.roarTimer = 24; // frames
        this.dino.roarCooldown = this.dino.maxRoarCooldown;
        this.audio.playRoar();
        this.addCameraShake(7, 20);

        // Add visual sonic wave shockwave
        this.shockwaves.push({
            x: this.dino.x + 35,
            y: this.dino.y + 15,
            radius: 10,
            maxRadius: 180,
            speed: 12,
            alpha: 1.0
        });

        // Destroy or blast threats ahead
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            if (obs.x > this.dino.x && obs.x < this.dino.x + 280) {
                this.explodeObstacle(obs);
                this.obstacles.splice(i, 1);
                this.score += 50;
            }
        }
    }

    addCameraShake(magnitude, duration) {
        this.shakeMagnitude = magnitude;
        this.shakeTime = duration;
    }

    showNotice(text) {
        // Subtle HUD banner notice
        this.hudNotice = { text, timer: 90 };
    }

    // Main Update Loop
    update() {
        if (this.hudNotice && this.hudNotice.timer > 0) {
            this.hudNotice.timer--;
        }

        // Ambient particles (always update)
        this.updateAmbient();

        if (this.state !== 'RUNNING') return;

        // Speed ramp up smoothly
        this.distance += this.currentSpeed * 0.05;
        this.score = Math.floor(this.distance);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('apex_dino_hiscore', this.highScore.toString());
        }

        // Milestone audio every 500m
        if (Math.floor(this.distance) % 500 < Math.floor(this.currentSpeed * 0.05)) {
            this.audio.playMilestone();
            this.showNotice(`BIOME DISCOVERY - ${Math.floor(this.distance)}m`);
        }

        // Update Biome
        if (this.distance < 600) {
            this.biome = 'BADLANDS';
        } else if (this.distance < 1400) {
            this.biome = 'JUNGLE';
        } else {
            this.biome = 'VOLCANO';
        }

        this.dayCycle = (this.distance * 0.0003) % 1;

        // Smooth speed curve based on score / distance
        const targetSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance * 0.0035));
        this.currentSpeed += (targetSpeed - this.currentSpeed) * 0.015;

        // Dino Update
        this.updateDino();

        // Parallax Update
        this.bgLayers.forEach(layer => {
            layer.x = (layer.x - this.currentSpeed * layer.speed) % CANVAS_WIDTH;
        });

        // Obstacles & Items
        this.updateObstacles();
        this.updatePickups();

        // Particles & FX
        this.updateParticles();
        this.updateShockwaves();

        // Shake Decay
        if (this.shakeTime > 0) {
            this.shakeTime--;
        }
    }

    updateDino() {
        const d = this.dino;

        // Cooldowns & Frenzy
        if (d.roarCooldown > 0) d.roarCooldown--;
        if (d.roarTimer > 0) {
            d.roarTimer--;
            if (d.roarTimer === 0) d.isRoaring = false;
        }
        if (d.frenzyTimer > 0) {
            d.frenzyTimer--;
            // Frenzy spark trail
            if (Math.random() < 0.6) {
                this.particles.push({
                    x: d.x + Math.random() * 30,
                    y: d.y + Math.random() * 30,
                    vx: -this.currentSpeed * 0.5,
                    vy: Math.random() * 2 - 1,
                    size: 3,
                    color: '#ff758f',
                    life: 18,
                    maxLife: 18
                });
            }
        }

        // Ducking
        const wasDucking = d.isDucking;
        d.isDucking = this.keys.duck && d.isGrounded;

        if (d.isDucking && !wasDucking) {
            this.audio.playSkid();
            // Skid particles
            for (let i = 0; i < 4; i++) {
                this.particles.push({
                    x: d.x + 20,
                    y: GROUND_Y - 2,
                    vx: -(Math.random() * 4 + 2),
                    vy: -(Math.random() * 2 + 1),
                    size: 3,
                    color: '#c2b280',
                    life: 20,
                    maxLife: 20
                });
            }
        }

        // Dimensions change on crouch
        if (d.isDucking) {
            d.w = 48;
            d.h = 24;
            d.y = GROUND_Y - 24;
        } else {
            d.w = 48;
            d.h = 40;
        }

        // Jump Physics
        if (d.isGrounded) {
            d.coyoteTimer = 6;
        } else if (d.coyoteTimer > 0) {
            d.coyoteTimer--;
        }

        if (d.jumpBuffer > 0) {
            d.jumpBuffer--;
            if (d.coyoteTimer > 0 && !d.isDucking) {
                d.vy = d.jumpForce;
                d.isGrounded = false;
                d.coyoteTimer = 0;
                d.jumpBuffer = 0;
                this.audio.playJump();

                // Jump take-off dust
                for (let i = 0; i < 6; i++) {
                    this.particles.push({
                        x: d.x + 20 + Math.random() * 15,
                        y: GROUND_Y - 2,
                        vx: (Math.random() * 4 - 2) - this.currentSpeed * 0.3,
                        vy: -(Math.random() * 3 + 1),
                        size: 3,
                        color: '#d4a373',
                        life: 22,
                        maxLife: 22
                    });
                }
            }
        }

        // Apply Gravity
        if (!d.isGrounded) {
            d.vy += d.gravity;
            d.y += d.vy;

            // Fast fall when pressing down in mid-air
            if (this.keys.duck) {
                d.vy += 1.2;
            }

            if (d.y >= GROUND_Y - d.h) {
                d.y = GROUND_Y - d.h;
                d.vy = 0;
                d.isGrounded = true;
                this.audio.playStep();

                // Landing impact dust
                for (let i = 0; i < 8; i++) {
                    this.particles.push({
                        x: d.x + 22 + (Math.random() * 16 - 8),
                        y: GROUND_Y - 2,
                        vx: (Math.random() * 5 - 2.5),
                        vy: -(Math.random() * 2.5 + 0.5),
                        size: 3,
                        color: '#d4a373',
                        life: 18,
                        maxLife: 18
                    });
                }
            }
        }

        // Running gait animation timer
        d.animTimer += (this.currentSpeed / this.baseSpeed) * 0.25;
        if (d.animTimer >= 1) {
            d.animFrame++;
            d.animTimer = 0;
            if (d.isGrounded && !d.isDucking) {
                if (d.animFrame % 3 === 0) {
                    this.audio.playStep();
                    // Running footstep puff
                    this.particles.push({
                        x: d.x + 8,
                        y: GROUND_Y - 2,
                        vx: -this.currentSpeed * 0.4,
                        vy: -Math.random() * 1.5,
                        size: 2,
                        color: '#c2b280',
                        life: 14,
                        maxLife: 14
                    });
                }
            }
        }
    }

    updateObstacles() {
        // Spawn Obstacles
        this.nextSpawnDistance -= this.currentSpeed;
        if (this.nextSpawnDistance <= 0) {
            this.spawnObstaclePattern();
            // Minimum space ensures game remains fair at high speeds
            const minGap = 220 + (this.currentSpeed * 14);
            const varGap = Math.random() * 160;
            this.nextSpawnDistance = minGap + varGap;
        }

        // Update each obstacle
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= (this.currentSpeed + (obs.extraSpeed || 0));

            // Wing flap / raptor running animation
            obs.animTimer = (obs.animTimer || 0) + 0.2;
            if (obs.animTimer >= 1) {
                obs.animFrame = ((obs.animFrame || 0) + 1);
                obs.animTimer = 0;
            }

            // Pterosaur sinusoidal flight pattern
            if (obs.type === 'pterosaur' && obs.sineFreq) {
                obs.y += Math.sin(obs.x * obs.sineFreq) * 0.7;
            }

            // Check Collision
            if (this.checkCollision(this.dino, obs)) {
                if (this.dino.frenzyTimer > 0) {
                    // Shatter obstacle during frenzy!
                    this.explodeObstacle(obs);
                    this.obstacles.splice(i, 1);
                    this.score += 100;
                    this.addCameraShake(5, 12);
                    continue;
                } else {
                    this.triggerGameOver();
                    return;
                }
            }

            // Remove offscreen
            if (obs.x + obs.w < -60) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    spawnObstaclePattern() {
        const roll = Math.random();

        // 1. Pterosaurs (Flyers)
        if (this.distance > 250 && roll < 0.32) {
            // Heights: 0 = Low (must duck), 1 = Mid (can duck or jump over), 2 = High (run under)
            const heightRoll = Math.random();
            let yPos, elevType;

            if (heightRoll < 0.42) {
                // Must duck
                yPos = GROUND_Y - 32;
                elevType = 'low';
            } else if (heightRoll < 0.75) {
                // Jumpable
                yPos = GROUND_Y - 56;
                elevType = 'mid';
            } else {
                // High glide
                yPos = GROUND_Y - 88;
                elevType = 'high';
            }

            this.obstacles.push({
                type: 'pterosaur',
                x: CANVAS_WIDTH + 40,
                y: yPos,
                w: 44,
                h: 24,
                boxOffsetX: 4,
                boxOffsetY: 4,
                boxW: 36,
                boxH: 18,
                elevType,
                extraSpeed: 1.2,
                sineFreq: 0.02,
                animFrame: 0
            });
            return;
        }

        // 2. Fast Raptor Hunter
        if (this.distance > 800 && roll < 0.50) {
            this.obstacles.push({
                type: 'raptor',
                x: CANVAS_WIDTH + 40,
                y: GROUND_Y - 28,
                w: 36,
                h: 28,
                boxOffsetX: 3,
                boxOffsetY: 4,
                boxW: 30,
                boxH: 24,
                extraSpeed: 2.8, // runs toward dino fast!
                animFrame: 0
            });
            return;
        }

        // 3. Ground Flora & Boulders
        const groundTypes = [
            { type: 'cactusSmall', w: 26, h: 44, boxOffsetX: 4, boxOffsetY: 4, boxW: 18, boxH: 40 },
            { type: 'cactusDouble', w: 40, h: 46, boxOffsetX: 4, boxOffsetY: 4, boxW: 32, boxH: 42 },
            { type: 'fossilRock', w: 38, h: 32, boxOffsetX: 4, boxOffsetY: 4, boxW: 30, boxH: 28 },
            { type: 'cycad', w: 42, h: 60, boxOffsetX: 6, boxOffsetY: 6, boxW: 30, boxH: 54 }
        ];

        // Biome weightings
        let selected;
        if (this.biome === 'BADLANDS') {
            selected = (Math.random() < 0.6) ? groundTypes[0] : groundTypes[1];
        } else if (this.biome === 'JUNGLE') {
            selected = (Math.random() < 0.55) ? groundTypes[3] : groundTypes[0];
        } else {
            selected = (Math.random() < 0.6) ? groundTypes[2] : groundTypes[1];
        }

        this.obstacles.push({
            type: selected.type,
            x: CANVAS_WIDTH + 40,
            y: GROUND_Y - selected.h,
            w: selected.w,
            h: selected.h,
            boxOffsetX: selected.boxOffsetX,
            boxOffsetY: selected.boxOffsetY,
            boxW: selected.boxW,
            boxH: selected.boxH
        });

        // 15% chance to spawn a Meat Pickup right above or after ground obstacle
        if (Math.random() < 0.16) {
            this.pickups.push({
                x: CANVAS_WIDTH + 40 + selected.w + 60,
                y: GROUND_Y - 55 - Math.random() * 30,
                w: 16,
                h: 14,
                floatOffset: Math.random() * Math.PI * 2
            });
        }
    }

    updatePickups() {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.x -= this.currentSpeed;
            p.floatOffset += 0.08;

            const floatY = p.y + Math.sin(p.floatOffset) * 4;

            // AABB Pickup Check with Dino
            if (
                this.dino.x < p.x + p.w &&
                this.dino.x + this.dino.w > p.x &&
                this.dino.y < floatY + p.h &&
                this.dino.y + this.dino.h > floatY
            ) {
                // Collect meat!
                this.dino.frenzyTimer = 240; // 4 seconds of frenzy shield
                this.dino.roarCooldown = 0;  // Reset roar
                this.score += 150;
                this.audio.playMilestone();
                this.showNotice('FRENZY INVULNERABILITY!');

                // Meat burst sparkle
                for (let k = 0; k < 14; k++) {
                    this.particles.push({
                        x: p.x + 8,
                        y: floatY + 7,
                        vx: Math.cos(k * 0.45) * 4,
                        vy: Math.sin(k * 0.45) * 4,
                        size: 3,
                        color: '#ff758f',
                        life: 25,
                        maxLife: 25
                    });
                }

                this.pickups.splice(i, 1);
                continue;
            }

            if (p.x + p.w < -40) {
                this.pickups.splice(i, 1);
            }
        }
    }

    checkCollision(d, obs) {
        // Precision AABB hitboxes
        const dBox = {
            x: d.x + (d.isDucking ? 6 : 8),
            y: d.y + (d.isDucking ? 4 : 4),
            w: d.w - (d.isDucking ? 10 : 16),
            h: d.h - (d.isDucking ? 6 : 8)
        };

        const oBox = {
            x: obs.x + (obs.boxOffsetX || 0),
            y: obs.y + (obs.boxOffsetY || 0),
            w: obs.boxW || obs.w,
            h: obs.boxH || obs.h
        };

        return (
            dBox.x < oBox.x + oBox.w &&
            dBox.x + dBox.w > oBox.x &&
            dBox.y < oBox.y + oBox.h &&
            dBox.y + dBox.h > oBox.y
        );
    }

    explodeObstacle(obs) {
        this.audio.playHit();
        for (let i = 0; i < 16; i++) {
            this.particles.push({
                x: obs.x + obs.w / 2,
                y: obs.y + obs.h / 2,
                vx: (Math.random() * 8 - 4) - this.currentSpeed * 0.3,
                vy: (Math.random() * 8 - 5),
                size: Math.random() * 3 + 2,
                color: (obs.type === 'pterosaur' || obs.type === 'raptor') ? '#9b2226' : '#52796f',
                life: 30,
                maxLife: 30
            });
        }
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        this.audio.playHit();
        this.addCameraShake(12, 35);

        // Splatter & death fragments
        for (let i = 0; i < 22; i++) {
            this.particles.push({
                x: this.dino.x + 24,
                y: this.dino.y + 20,
                vx: Math.random() * 8 - 4,
                vy: Math.random() * 8 - 6,
                size: Math.random() * 3 + 2,
                color: (i % 2 === 0) ? '#386641' : '#851e24',
                life: 40,
                maxLife: 40
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.18; // gravity
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateShockwaves() {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha = 1.0 - (sw.radius / sw.maxRadius);
            if (sw.radius >= sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    updateAmbient() {
        this.ambientParticles.forEach(p => {
            p.x += p.vx - (this.state === 'RUNNING' ? this.currentSpeed * 0.15 : 0);
            p.y += p.vy;
            if (p.x < -10) p.x = CANVAS_WIDTH + 10;
            if (p.y < 0) p.y = CANVAS_HEIGHT;
            if (p.y > CANVAS_HEIGHT) p.y = 0;
        });
    }

    // --- RENDERING PIPELINE ---
    render() {
        this.ctx.save();

        // Screen Shake
        if (this.shakeTime > 0) {
            const shakeX = (Math.random() * 2 - 1) * this.shakeMagnitude;
            const shakeY = (Math.random() * 2 - 1) * this.shakeMagnitude;
            this.ctx.translate(shakeX, shakeY);
        }

        // 1. Sky & Atmosphere
        this.renderSky();

        // 2. Parallax Backdrops
        this.renderVolcanoes(this.bgLayers[0].x);
        this.renderMountains(this.bgLayers[1].x);
        this.renderJungle(this.bgLayers[2].x);

        // 3. Ground Strata
        this.renderGround(this.bgLayers[3].x);

        // 4. Interactive Pickups
        this.renderPickups();

        // 5. Obstacles
        this.renderObstacles();

        // 6. Dinosaur Player
        this.renderDino();

        // 7. Shockwaves & Particles
        this.renderShockwaves();
        this.renderParticles();

        // 8. Ambient Fog & Volcanic Ash
        this.renderAmbient();

        // 9. HUD & UI Overlay
        this.renderUI();

        this.ctx.restore();
    }

    renderSky() {
        // Dynamic sky colors based on biome & day-night
        let skyGradient = this.ctx.createLinearGradient(0, 0, 0, GROUND_Y);

        if (this.biome === 'VOLCANO') {
            skyGradient.addColorStop(0, '#1c0a0a');
            skyGradient.addColorStop(0.6, '#3f1616');
            skyGradient.addColorStop(1, '#662211');
        } else if (this.biome === 'JUNGLE') {
            skyGradient.addColorStop(0, '#102027');
            skyGradient.addColorStop(0.6, '#1b3b36');
            skyGradient.addColorStop(1, '#375d50');
        } else {
            // Badlands / Sunset amber
            skyGradient.addColorStop(0, '#2b2d42');
            skyGradient.addColorStop(0.5, '#8d5b4c');
            skyGradient.addColorStop(1, '#e07a5f');
        }

        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Prehistoric Sun / Blood Moon
        this.ctx.fillStyle = (this.biome === 'VOLCANO') ? '#ff3b00' : '#f4a261';
        this.ctx.beginPath();
        this.ctx.arc(CANVAS_WIDTH * 0.8, 65, 26, 0, Math.PI * 2);
        this.ctx.fill();

        // Sun Corona glow
        this.ctx.fillStyle = (this.biome === 'VOLCANO') ? 'rgba(255, 60, 0, 0.18)' : 'rgba(244, 162, 97, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(CANVAS_WIDTH * 0.8, 65, 48, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderVolcanoes(offsetX) {
        this.ctx.save();
        this.ctx.fillStyle = (this.biome === 'VOLCANO') ? '#2a0e0e' : '#221b2b';

        // Draw repeating jagged volcano peaks
        for (let i = -1; i < 3; i++) {
            const baseX = offsetX + (i * 480);
            this.ctx.beginPath();
            this.ctx.moveTo(baseX - 40, GROUND_Y);
            this.ctx.lineTo(baseX + 100, 110); // crater peak 1
            this.ctx.lineTo(baseX + 130, 118); // caldera rim
            this.ctx.lineTo(baseX + 150, 110); // crater peak 2
            this.ctx.lineTo(baseX + 280, GROUND_Y);
            this.ctx.fill();

            // Glowing lava caldera
            this.ctx.fillStyle = '#ff5400';
            this.ctx.fillRect(baseX + 106, 113, 38, 4);

            // Volcanic smoke plume rising
            this.ctx.fillStyle = 'rgba(40, 20, 20, 0.35)';
            this.ctx.fillRect(baseX + 115, 70, 20, 42);
            this.ctx.fillRect(baseX + 120, 40, 30, 32);

            this.ctx.fillStyle = (this.biome === 'VOLCANO') ? '#2a0e0e' : '#221b2b';
        }
        this.ctx.restore();
    }

    renderMountains(offsetX) {
        this.ctx.save();
        this.ctx.fillStyle = (this.biome === 'JUNGLE') ? '#132a22' : '#3d314a';

        for (let i = -1; i < 3; i++) {
            const baseX = offsetX + (i * 380);
            this.ctx.beginPath();
            this.ctx.moveTo(baseX - 60, GROUND_Y);
            this.ctx.lineTo(baseX + 80, 150);
            this.ctx.lineTo(baseX + 180, GROUND_Y);
            this.ctx.lineTo(baseX + 250, 170);
            this.ctx.lineTo(baseX + 340, GROUND_Y);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    renderJungle(offsetX) {
        this.ctx.save();
        this.ctx.fillStyle = (this.biome === 'JUNGLE') ? '#1e4438' : '#2b3a32';

        for (let i = -1; i < 4; i++) {
            const baseX = offsetX + (i * 260);
            // Prehistoric fern canopy silhouette
            this.ctx.beginPath();
            this.ctx.arc(baseX + 60, 225, 42, Math.PI, 0);
            this.ctx.arc(baseX + 130, 235, 34, Math.PI, 0);
            this.ctx.arc(baseX + 190, 220, 48, Math.PI, 0);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    renderGround(offsetX) {
        this.ctx.save();

        // 1. Top Substrata (Dirt/Grass/Ash edge)
        const topColor = (this.biome === 'VOLCANO') ? '#3a201a' :
                         (this.biome === 'JUNGLE') ? '#2d5a27' : '#99582a';
        this.ctx.fillStyle = topColor;
        this.ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 6);

        // 2. Deep Prehistoric Soil & Rock Bed
        const bedColor = (this.biome === 'VOLCANO') ? '#1f1311' :
                         (this.biome === 'JUNGLE') ? '#1b2d18' : '#43281c';
        this.ctx.fillStyle = bedColor;
        this.ctx.fillRect(0, GROUND_Y + 6, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - 6);

        // 3. Scrolling Fossils & Sedimentary Layering
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        for (let i = -1; i < 8; i++) {
            const seamX = (offsetX + (i * 140)) % CANVAS_WIDTH;
            // Fossil bone band
            this.ctx.fillRect(seamX, GROUND_Y + 22, 28, 4);
            this.ctx.fillRect(seamX + 5, GROUND_Y + 19, 6, 10);
            this.ctx.fillRect(seamX + 18, GROUND_Y + 19, 6, 10);

            // Rock pebble strata
            this.ctx.fillRect(seamX + 65, GROUND_Y + 44, 16, 6);
            this.ctx.fillRect(seamX + 90, GROUND_Y + 32, 10, 4);
        }

        // Ground line separator
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, GROUND_Y - 1, CANVAS_WIDTH, 1);

        this.ctx.restore();
    }

    renderPickups() {
        this.pickups.forEach(p => {
            const floatY = p.y + Math.sin(p.floatOffset) * 4;
            const meatImg = this.sprites.cache.decor.meat;
            if (meatImg) {
                this.ctx.drawImage(meatImg, Math.floor(p.x), Math.floor(floatY));
            }

            // Glow indicator ring
            this.ctx.strokeStyle = 'rgba(255, 117, 143, 0.45)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(p.x + 9, floatY + 8, 12, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }

    renderObstacles() {
        this.obstacles.forEach(obs => {
            let img = null;
            if (obs.type === 'pterosaur') {
                const frames = this.sprites.cache.pterosaur;
                img = frames[obs.animFrame % frames.length];
            } else if (obs.type === 'raptor') {
                const frames = this.sprites.cache.raptor;
                img = frames[obs.animFrame % frames.length];
            } else if (this.sprites.cache.obstacles[obs.type]) {
                img = this.sprites.cache.obstacles[obs.type];
            }

            if (img) {
                this.ctx.drawImage(img, Math.floor(obs.x), Math.floor(obs.y));
            }
        });
    }

    renderDino() {
        const d = this.dino;
        let sprite = null;

        if (this.state === 'GAMEOVER') {
            sprite = this.sprites.cache.dinoDead;
        } else if (d.isRoaring) {
            sprite = this.sprites.cache.dinoRoar;
        } else if (!d.isGrounded) {
            sprite = this.sprites.cache.dinoJump;
        } else if (d.isDucking) {
            const duckFrames = this.sprites.cache.dinoDuck;
            sprite = duckFrames[d.animFrame % duckFrames.length];
        } else {
            const runFrames = this.sprites.cache.dinoRun;
            sprite = runFrames[d.animFrame % runFrames.length];
        }

        if (sprite) {
            // Frenzy aura glow
            if (d.frenzyTimer > 0) {
                this.ctx.save();
                this.ctx.shadowColor = '#ff4d6d';
                this.ctx.shadowBlur = 14;
                this.ctx.drawImage(sprite, Math.floor(d.x), Math.floor(d.y));
                this.ctx.restore();
            } else {
                this.ctx.drawImage(sprite, Math.floor(d.x), Math.floor(d.y));
            }
        }
    }

    renderShockwaves() {
        this.shockwaves.forEach(sw => {
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 200, 100, ${sw.alpha})`;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(sw.x, sw.y, sw.radius, -Math.PI * 0.45, Math.PI * 0.45);
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    renderParticles() {
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        });
        this.ctx.globalAlpha = 1.0;
    }

    renderAmbient() {
        this.ambientParticles.forEach(p => {
            this.ctx.fillStyle = (this.biome === 'VOLCANO') ? '#ff5400' : '#ffffff';
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        });
        this.ctx.globalAlpha = 1.0;
    }

    renderUI() {
        const ctx = this.ctx;

        // Pixel Font settings
        ctx.fillStyle = '#f8f9fa';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textBaseline = 'top';

        // 1. Distance & Score
        const scoreStr = this.score.toString().padStart(5, '0');
        const hiStr = this.highScore.toString().padStart(5, '0');
        ctx.fillText(`HI ${hiStr}  ${scoreStr}m`, CANVAS_WIDTH - 230, 20);

        // 2. Biome & Speed Indicator
        ctx.fillStyle = '#ffb703';
        ctx.fillText(`[${this.biome}]  ${(this.currentSpeed * 3).toFixed(0)} KM/H`, 24, 20);

        // 3. Roar Ready / Cooldown Bar
        const barW = 120;
        const barH = 10;
        const barX = 24;
        const barY = 46;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        const roarProgress = 1.0 - (this.dino.roarCooldown / this.dino.maxRoarCooldown);
        ctx.fillStyle = (roarProgress >= 1.0) ? '#ffb703' : '#457b9d';
        ctx.fillRect(barX + 1, barY + 1, (barW - 2) * roarProgress, barH - 2);

        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillStyle = (roarProgress >= 1.0) ? '#ffb703' : '#a8dadc';
        ctx.fillText(roarProgress >= 1.0 ? 'ROAR READY [SHIFT]' : 'RECHARGING...', barX + barW + 10, barY);

        // 4. Temporary HUD notice banner
        if (this.hudNotice && this.hudNotice.timer > 0) {
            ctx.fillStyle = '#ff0054';
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.hudNotice.text, CANVAS_WIDTH / 2, 75);
            ctx.textAlign = 'start';
        }

        // 5. Title Screen Overlay
        if (this.state === 'TITLE') {
            ctx.fillStyle = 'rgba(10, 10, 18, 0.75)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffb703';
            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.fillText('APEX DINO: EXTINCTION RUN', CANVAS_WIDTH / 2, 90);

            ctx.fillStyle = '#f8f9fa';
            ctx.font = '16px "Courier New", monospace';
            ctx.fillText('REALISTIC 16-BIT PREHISTORIC RUNNER', CANVAS_WIDTH / 2, 138);

            ctx.fillStyle = '#06d6a0';
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillText('PRESS SPACE / TAP TO START', CANVAS_WIDTH / 2, 200);

            ctx.fillStyle = '#ced4da';
            ctx.font = '13px "Courier New", monospace';
            ctx.fillText('[SPACE / UP] Jump (Variable)  |  [DOWN] Skid Crouch  |  [SHIFT / E] Roar Wave', CANVAS_WIDTH / 2, 246);
            ctx.fillText('Collect Prime Meat for Frenzy invulnerability!', CANVAS_WIDTH / 2, 272);
            ctx.textAlign = 'start';
        }

        // 6. Game Over Overlay
        if (this.state === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(20, 5, 5, 0.82)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#e63946';
            ctx.font = 'bold 38px "Courier New", monospace';
            ctx.fillText('EXTINCTION LEVEL IMPACT', CANVAS_WIDTH / 2, 100);

            ctx.fillStyle = '#f8f9fa';
            ctx.font = '20px "Courier New", monospace';
            ctx.fillText(`FINAL DISTANCE: ${this.score} METERS`, CANVAS_WIDTH / 2, 155);

            if (this.score === this.highScore && this.score > 0) {
                ctx.fillStyle = '#ffb703';
                ctx.fillText('★ NEW APEX RECORD! ★', CANVAS_WIDTH / 2, 185);
            }

            ctx.fillStyle = '#06d6a0';
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillText('PRESS SPACE / TAP TO RESTART', CANVAS_WIDTH / 2, 240);
            ctx.textAlign = 'start';
        }
    }

    // Engine Main Loop (Fixed 60Hz Timestep: Butter-smooth, zero jitter, display-rate independent)
    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Cap runaway delta (e.g. background tab switch)
        if (delta > 200) delta = 200;
        this.accumulator += delta;

        // Update physics in fixed 16.6ms intervals
        while (this.accumulator >= this.stepSize) {
            this.update();
            this.accumulator -= this.stepSize;
        }

        // Render at native refresh rate
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// Start Game on window load
window.addEventListener('load', () => {
    window.game = new Game();
});
