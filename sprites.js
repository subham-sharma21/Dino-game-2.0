// Procedural Pixel Art Generator & Sprite Cache
const PixelPalette = {
    dino: {
        dark: '#1b2d18',
        body: '#2d4a22',
        mid: '#3d6330',
        light: '#538342',
        belly: '#8cb369',
        bellyLight: '#b5d48a',
        teeth: '#fefae0',
        eye: '#f77f00',
        pupil: '#111111',
        mouth: '#851e24',
        claw: '#1b1b1b'
    },
    pterosaur: {
        dark: '#401f0b',
        body: '#6d3615',
        wingLight: '#b86b35',
        wingDark: '#8a4b1e',
        beak: '#e09f3e',
        eye: '#d90429',
        claw: '#222222'
    },
    raptor: {
        dark: '#351c1c',
        body: '#6b2d2d',
        light: '#944242',
        belly: '#d48b8b',
        eye: '#ffba08',
        claws: '#111111'
    },
    flora: {
        outline: '#081409',
        c1: '#1b4332',
        c2: '#2d6a4f',
        c3: '#52b788',
        c4: '#95d5b2',
        spine: '#ffffff',
        accent: '#ffea00',
        flower: '#ff0054'
    },
    rock: {
        base: '#2b2d42',
        mid: '#4a4e69',
        light: '#6c757d',
        fossil: '#d8d5db'
    }
};

class SpriteEngine {
    constructor() {
        this.cache = {};
        this.initSprites();
    }

    createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        return { canvas: c, ctx };
    }

    initSprites() {
        this.generateDinoRunFrames();
        this.generateDinoJumpFrame();
        this.generateDinoDuckFrames();
        this.generateDinoDeadFrame();
        this.generatePterosaurFrames();
        this.generateRaptorFrames();
        this.generateObstacles();
        this.generateDecorations();
    }

    // High detail 48x40 Dino pixel drawer
    drawDetailedDino(ctx, frame, state = 'run') {
        const p = PixelPalette.dino;
        ctx.save();

        let headY = 0;
        let legOffsetL = 0;
        let legOffsetR = 0;
        let tailAngle = 0;
        let mouthOpen = false;

        if (state === 'run') {
            headY = (frame % 2 === 0) ? 0 : 1;
            const legWalk = [
                { l: 0, r: 4 },
                { l: 2, r: 2 },
                { l: 4, r: 0 },
                { l: 3, r: 1 },
                { l: 1, r: 3 },
                { l: 0, r: 2 }
            ];
            const current = legWalk[frame % legWalk.length];
            legOffsetL = current.l;
            legOffsetR = current.r;
            tailAngle = (frame % 3 === 0) ? -1 : 1;
        } else if (state === 'jump') {
            headY = -2;
            legOffsetL = 5;
            legOffsetR = 3;
            tailAngle = -2;
        } else if (state === 'duck') {
            headY = 8;
            legOffsetL = (frame % 2 === 0) ? 0 : 2;
            legOffsetR = (frame % 2 === 0) ? 2 : 0;
            tailAngle = 2;
        } else if (state === 'roar') {
            headY = -1;
            mouthOpen = true;
            tailAngle = -1;
        } else if (state === 'dead') {
            headY = 4;
            mouthOpen = true;
        }

        const P = (x, y, w, h, col) => {
            ctx.fillStyle = col;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        };

        if (state === 'duck') {
            // Lowered streamlined silhouette (48x24)
            // Tail
            P(2, 12 + tailAngle, 10, 5, p.dark);
            P(4, 13 + tailAngle, 8, 3, p.mid);
            P(6, 11 + tailAngle, 5, 2, p.light);

            // Low Torso
            P(12, 11, 20, 8, p.dark);
            P(13, 12, 18, 6, p.body);
            P(15, 13, 15, 4, p.mid);
            P(18, 16, 12, 3, p.belly);

            // Extended Low Head
            P(32, 10, 14, 8, p.dark);
            P(33, 11, 13, 6, p.body);
            P(35, 12, 10, 4, p.light);
            P(39, 11, 2, 2, p.eye);
            P(40, 11, 1, 1, p.pupil);
            P(38, 15, 7, 2, p.bellyLight);
            P(43, 14, 3, 1, p.teeth);

            // Crouched Back Leg
            P(16, 18, 5, 5, p.dark);
            P(15 + legOffsetL, 22, 6, 2, p.claw);

            // Crouched Front Leg
            P(24, 18, 5, 5, p.mid);
            P(23 + legOffsetR, 22, 6, 2, p.claw);

            // Tiny T-Rex Arm forward
            P(30, 15, 4, 2, p.mid);
            P(33, 16, 2, 2, p.claw);
            ctx.restore();
            return;
        }

        // --- NORMAL / RUN / JUMP / ROAR / DEAD DINOSAUR (48x40) ---

        // 1. Articulated Tail
        P(2, 16 + tailAngle, 4, 3, p.dark);
        P(6, 15 + tailAngle, 6, 5, p.dark);
        P(8, 16 + tailAngle, 4, 3, p.body);
        P(12, 14, 6, 7, p.dark);
        P(13, 15, 5, 5, p.body);
        P(14, 13 + tailAngle, 3, 2, p.light); // dorsal ridge

        // 2. Muscular Pelvis & Torso
        P(18, 11, 15, 14, p.dark);
        P(19, 12, 13, 12, p.body);
        P(21, 13, 9, 8, p.mid);
        P(22, 12, 6, 2, p.light); // spine ridge
        P(22, 20, 9, 4, p.belly);
        P(23, 22, 7, 2, p.bellyLight);

        // 3. Neck & Powerful Head
        const hY = 4 + headY;
        P(29, hY + 7, 8, 8, p.dark);
        P(30, hY + 8, 6, 6, p.body);

        // Skull
        P(30, hY, 16, 10, p.dark);
        P(31, hY + 1, 14, 8, p.body);
        P(33, hY + 2, 11, 5, p.light);

        // Snout & Brow
        P(32, hY - 1, 8, 2, p.light); // brow ridge
        P(36, hY + 2, 2, 2, p.eye);
        P(37, hY + 2, 1, 1, p.pupil);

        if (mouthOpen) {
            // Open Jaws
            P(38, hY + 5, 8, 2, p.mouth);
            P(40, hY + 4, 2, 1, p.teeth);
            P(43, hY + 4, 2, 1, p.teeth);
            // Lower jaw
            P(36, hY + 9, 9, 3, p.dark);
            P(37, hY + 9, 8, 2, p.body);
            P(40, hY + 8, 2, 1, p.teeth);
        } else {
            // Closed Jaw
            P(38, hY + 6, 7, 1, p.dark);
            P(40, hY + 5, 1, 1, p.teeth);
            P(43, hY + 5, 1, 1, p.teeth);
            P(37, hY + 7, 8, 3, p.body);
            P(38, hY + 8, 6, 1, p.bellyLight);
        }

        // 4. Tiny Forelimbs (Arms)
        P(29, 17 + headY, 3, 2, p.mid);
        P(31, 19 + headY, 2, 3, p.light);
        P(32, 21 + headY, 2, 1, p.claw);

        // 5. Powerful Hind Legs
        // Left Leg (Behind)
        P(17, 22, 6, 7, p.dark);
        P(18, 28, 4, 6 - legOffsetL, p.dark);
        P(16, 34 - legOffsetL, 6, 3, p.claw);

        // Right Leg (Foreground)
        P(22, 21, 8, 8, p.mid);
        P(24, 22, 5, 6, p.light);
        P(24, 28, 4, 6 - legOffsetR, p.body);
        P(23, 34 - legOffsetR, 7, 3, p.claw);

        ctx.restore();
    }

    generateDinoRunFrames() {
        this.cache.dinoRun = [];
        for (let i = 0; i < 6; i++) {
            const { canvas, ctx } = this.createCanvas(48, 40);
            this.drawDetailedDino(ctx, i, 'run');
            this.cache.dinoRun.push(canvas);
        }
    }

    generateDinoJumpFrame() {
        const { canvas, ctx } = this.createCanvas(48, 40);
        this.drawDetailedDino(ctx, 0, 'jump');
        this.cache.dinoJump = canvas;

        const roarCanvas = this.createCanvas(48, 40);
        this.drawDetailedDino(roarCanvas.ctx, 0, 'roar');
        this.cache.dinoRoar = roarCanvas.canvas;
    }

    generateDinoDuckFrames() {
        this.cache.dinoDuck = [];
        for (let i = 0; i < 4; i++) {
            const { canvas, ctx } = this.createCanvas(48, 26);
            this.drawDetailedDino(ctx, i, 'duck');
            this.cache.dinoDuck.push(canvas);
        }
    }

    generateDinoDeadFrame() {
        const { canvas, ctx } = this.createCanvas(48, 40);
        this.drawDetailedDino(ctx, 0, 'dead');
        this.cache.dinoDead = canvas;
    }

    // Pterosaur flying animation (44x28)
    generatePterosaurFrames() {
        this.cache.pterosaur = [];
        const p = PixelPalette.pterosaur;
        const P = (ctx, x, y, w, h, col) => {
            ctx.fillStyle = col;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        };

        const wingStates = [
            { wingY: 2, tipY: -2, span: 12 },   // Up
            { wingY: 6, tipY: 5, span: 14 },    // Mid-level glide
            { wingY: 12, tipY: 18, span: 13 },  // Down stroke
            { wingY: 7, tipY: 6, span: 14 }     // Recovery
        ];

        wingStates.forEach(st => {
            const { canvas, ctx } = this.createCanvas(46, 32);

            // Long Crest and Beak
            P(ctx, 22, 12, 10, 5, p.dark);
            P(ctx, 24, 13, 8, 3, p.body);
            // Crest
            P(ctx, 16, 9, 8, 4, p.beak);
            P(ctx, 13, 8, 4, 3, p.wingDark);
            // Eye
            P(ctx, 28, 13, 2, 2, p.eye);
            // Long Beak
            P(ctx, 32, 14, 12, 3, p.beak);
            P(ctx, 36, 15, 8, 1, p.dark);

            // Body & Tail
            P(ctx, 14, 14, 10, 6, p.dark);
            P(ctx, 15, 15, 8, 4, p.body);
            P(ctx, 8, 16, 6, 2, p.dark); // tail spine

            // Left / Far Wing
            P(ctx, 16, st.wingY + 2, 14, 3, p.wingDark);
            P(ctx, 10, st.tipY + 2, 8, 3, p.dark);

            // Right / Near Wing Membrane
            P(ctx, 18, st.wingY, 16, 5, p.wingLight);
            P(ctx, 14, st.tipY, 10, 4, p.wingDark);
            P(ctx, 12, st.tipY - 1, 3, 2, p.claw); // wing finger hook

            // Feet tucked
            P(ctx, 11, 19, 4, 2, p.claw);

            this.cache.pterosaur.push(canvas);
        });
    }

    // Fast Runner Raptor Obstacle (36x28)
    generateRaptorFrames() {
        this.cache.raptor = [];
        const p = PixelPalette.raptor;
        const P = (ctx, x, y, w, h, col) => {
            ctx.fillStyle = col;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        };

        for (let i = 0; i < 4; i++) {
            const { canvas, ctx } = this.createCanvas(38, 28);
            const legShift = (i % 2 === 0) ? 0 : 3;

            // Tail
            P(ctx, 1, 10, 10, 2, p.dark);
            P(ctx, 8, 11, 6, 3, p.body);

            // Torso
            P(ctx, 13, 9, 12, 8, p.dark);
            P(ctx, 14, 10, 10, 6, p.body);
            P(ctx, 16, 12, 7, 3, p.belly);

            // Head and Snout
            P(ctx, 23, 6, 10, 7, p.dark);
            P(ctx, 24, 7, 8, 5, p.light);
            P(ctx, 27, 8, 2, 2, p.eye);
            P(ctx, 31, 9, 5, 3, p.dark); // sharp snout
            P(ctx, 32, 11, 3, 1, '#fff'); // small teeth

            // Sickle Claw Legs
            P(ctx, 15, 17, 4, 6 - legShift, p.dark);
            P(ctx, 14, 23 - legShift, 5, 2, p.claws);
            P(ctx, 20, 17, 4, 6 + legShift, p.body);
            P(ctx, 19, 23 + legShift, 5, 2, p.claws);

            this.cache.raptor.push(canvas);
        }
    }

    // Prehistoric obstacles
    generateObstacles() {
        this.cache.obstacles = {};
        const f = PixelPalette.flora;
        const r = PixelPalette.rock;

        const P = (ctx, x, y, w, h, col) => {
            ctx.fillStyle = col;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        };

        // 1. Spiky Ancient Cactus (Small) - 24x42 (Crisp outline + bright contrasting body)
        {
            const { canvas, ctx } = this.createCanvas(26, 44);
            // Black outline backing
            P(ctx, 6, 4, 14, 40, f.outline);
            P(ctx, 1, 12, 10, 16, f.outline);
            P(ctx, 15, 16, 10, 16, f.outline);

            // Main stem
            P(ctx, 8, 6, 10, 37, f.c2);
            P(ctx, 10, 6, 4, 37, f.c3);
            P(ctx, 12, 7, 2, 35, f.c4);

            // Left branch
            P(ctx, 3, 14, 7, 6, f.c2);
            P(ctx, 3, 8, 6, 10, f.c3);
            P(ctx, 4, 8, 2, 8, f.c4);

            // Right branch
            P(ctx, 16, 18, 7, 6, f.c2);
            P(ctx, 17, 12, 6, 10, f.c3);
            P(ctx, 19, 12, 2, 8, f.c4);

            // High-contrast bright spines
            P(ctx, 0, 9, 3, 2, f.spine);
            P(ctx, 0, 15, 3, 2, f.spine);
            P(ctx, 23, 13, 3, 2, f.spine);
            P(ctx, 23, 19, 3, 2, f.spine);
            P(ctx, 8, 4, 3, 2, f.accent);
            P(ctx, 15, 4, 3, 2, f.accent);
            P(ctx, 11, 16, 2, 2, f.spine);
            P(ctx, 11, 26, 2, 2, f.spine);
            this.cache.obstacles.cactusSmall = canvas;
        }

        // 2. Prehistoric Giant Cycad / Thorny Tree - 40x58
        {
            const { canvas, ctx } = this.createCanvas(42, 60);
            // Trunk outline
            P(ctx, 13, 17, 14, 43, '#100a06');
            // Trunk core
            P(ctx, 15, 18, 10, 41, '#4a2818');
            P(ctx, 18, 19, 4, 39, '#824c2d');
            P(ctx, 20, 20, 2, 37, '#b07048');

            // Foliage outline
            P(ctx, 1, 3, 38, 20, f.outline);
            // Foliage layers
            P(ctx, 3, 5, 34, 16, f.c1);
            P(ctx, 6, 6, 28, 14, f.c2);
            P(ctx, 10, 4, 20, 11, f.c3);
            P(ctx, 14, 2, 12, 6, f.c4);

            // Vibrant warning bloom
            P(ctx, 8, 8, 4, 4, f.flower);
            P(ctx, 28, 7, 4, 4, f.flower);
            P(ctx, 18, 3, 4, 4, f.flower);
            P(ctx, 19, 4, 2, 2, f.spine);
            this.cache.obstacles.cycad = canvas;
        }

        // 3. Ancient Fossil Boulder - 36x30
        {
            const { canvas, ctx } = this.createCanvas(38, 32);
            // Bold outline
            P(ctx, 2, 2, 34, 29, '#111218');
            // Rock body
            P(ctx, 4, 4, 30, 25, r.base);
            P(ctx, 6, 6, 24, 20, r.mid);
            P(ctx, 9, 7, 16, 12, r.light);

            // High contrast ammonite fossil
            P(ctx, 13, 11, 8, 8, '#ffffff');
            P(ctx, 15, 13, 4, 4, r.base);
            P(ctx, 17, 15, 2, 2, '#ffea00');
            this.cache.obstacles.fossilRock = canvas;
        }

        // 4. Double Spiky Cactus - 38x44
        {
            const { canvas, ctx } = this.createCanvas(40, 46);
            // Dark silhouette backings
            P(ctx, 4, 6, 14, 39, f.outline);
            P(ctx, 0, 14, 8, 14, f.outline);
            P(ctx, 19, 2, 16, 43, f.outline);
            P(ctx, 31, 11, 8, 14, f.outline);

            // Stem 1
            P(ctx, 6, 8, 10, 36, f.c2);
            P(ctx, 8, 8, 4, 36, f.c3);
            P(ctx, 2, 16, 6, 6, f.c3);
            P(ctx, 2, 10, 5, 8, f.c4);

            // Stem 2 (taller)
            P(ctx, 21, 4, 12, 40, f.c2);
            P(ctx, 24, 5, 6, 38, f.c3);
            P(ctx, 27, 6, 2, 36, f.c4);
            P(ctx, 31, 13, 6, 6, f.c3);
            P(ctx, 32, 8, 5, 8, f.c4);

            // Bright spines
            P(ctx, 0, 11, 3, 2, f.spine);
            P(ctx, 17, 10, 3, 2, f.accent);
            P(ctx, 37, 9, 3, 2, f.spine);
            P(ctx, 21, 2, 3, 2, f.accent);
            P(ctx, 28, 2, 3, 2, f.accent);
            P(ctx, 10, 22, 2, 2, f.spine);
            P(ctx, 26, 26, 2, 2, f.spine);
            this.cache.obstacles.cactusDouble = canvas;
        }
    }

    generateDecorations() {
        this.cache.decor = {};
        const P = (ctx, x, y, w, h, col) => {
            ctx.fillStyle = col;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        };

        // Prehistoric Bone / Skull Pickup - 18x14
        {
            const { canvas, ctx } = this.createCanvas(20, 16);
            P(ctx, 3, 3, 14, 9, '#e8e8e4');
            P(ctx, 5, 4, 10, 7, '#f8f9fa');
            P(ctx, 7, 6, 2, 3, '#212529'); // eye socket
            P(ctx, 12, 6, 2, 3, '#212529');
            P(ctx, 6, 11, 8, 3, '#d3d3d3'); // jaw
            P(ctx, 8, 10, 1, 2, '#fff'); // tooth
            P(ctx, 11, 10, 1, 2, '#fff');
            this.cache.decor.skull = canvas;
        }

        // Meat Steak (Sprint/Invincible boost) - 16x14
        {
            const { canvas, ctx } = this.createCanvas(18, 16);
            P(ctx, 3, 3, 12, 10, '#800f2f');
            P(ctx, 4, 4, 10, 8, '#c9184a');
            P(ctx, 6, 6, 6, 4, '#ff758f');
            // Bone center
            P(ctx, 8, 7, 3, 3, '#fff0f3');
            P(ctx, 1, 5, 3, 3, '#fff0f3');
            this.cache.decor.meat = canvas;
        }
    }
}

window.spriteEngine = new SpriteEngine();
