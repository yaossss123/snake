// 获取DOM元素
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const speedElement = document.getElementById('speed');
const bigFoodStatusElement = document.getElementById('big-food-status');
const highScoreElement = document.getElementById('high-score');
const currentThemeElement = document.getElementById('current-theme');
const startButton = document.getElementById('start-btn');
const pauseButton = document.getElementById('pause-btn');
const difficultySelect = document.getElementById('difficulty-select');

// 游戏配置
const gridSize = 20;
const gridWidth = canvas.width / gridSize;
const gridHeight = canvas.height / gridSize;

// 游戏状态
let snake = [];
let food = {};
let bigFood = null; // 大食物
let bigFoodTimer = null; // 大食物计时器
let bigFoodAppearTime = 0; // 大食物出现时间
let foodEatenCount = 0; // 吃到的普通食物计数
let direction = 'right';
let nextDirection = 'right';
let gameInterval;
let gameSpeed;
let score = 0;
let isPaused = false;
let isGameOver = false;
let isGameStarted = false;
let obstacles = []; // 障碍物数组
let powerUp = null; // 能力提升道具
let powerUpActive = false; // 是否激活能力提升
let powerUpTimer = null; // 能力提升计时器
let powerUpType = null; // 能力提升类型
let powerUpStartTime = null; // 能力提升开始时间

// 生存模式变量
let isSurvivalMode = false; // 是否为生存模式
let survivalLevel = 1; // 生存模式等级
let survivalTimer = 0; // 生存模式计时器
let survivalObstacleInterval = 30000; // 每30秒增加障碍物
let survivalSpeedIncrease = 0.1; // 每级速度增加

// 主题系统变量
let currentTheme = 'spring'; // 当前主题
let themeChangeTime = 0; // 主题变化时间
let backgroundOffset = 0; // 背景动画偏移

// 大食物配置
const BIG_FOOD_DURATION = 10000; // 大食物持续时间（毫秒）
const BIG_FOOD_APPEAR_THRESHOLD = 3; // 每吃几个普通食物出现大食物
const BIG_FOOD_MAX_SCORE = 50; // 大食物最高分数

// 历史记录相关函数
function getCurrentDifficulty() {
    return difficultySelect.value;
}

function loadHighScore() {
    const difficulty = getCurrentDifficulty();
    const savedHighScore = localStorage.getItem(`snakeHighScore_${difficulty}`);
    return savedHighScore ? parseInt(savedHighScore) : 0;
}

function saveHighScore(score) {
    const difficulty = getCurrentDifficulty();
    localStorage.setItem(`snakeHighScore_${difficulty}`, score.toString());
}

function updateHighScore(score) {
    const currentHighScore = loadHighScore();
    if (score > currentHighScore) {
        saveHighScore(score);
        highScoreElement.textContent = score;
        return true; // 返回true表示创造了新纪录
    }
    return false; // 返回false表示没有创造新纪录
}

function updateHighScoreDisplay() {
    const currentHighScore = loadHighScore();
    highScoreElement.textContent = currentHighScore;
}

// 主题系统函数
function getCurrentTheme() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // 节日主题优先级最高
    if (month === 1 && day >= 20 && day <= 30) return 'chineseNewYear'; // 春节
    if (month === 10 && day >= 25 && day <= 31) return 'halloween'; // 万圣节
    
    // 季节主题
    if (month >= 3 && month <= 5) return 'spring'; // 春季
    if (month >= 6 && month <= 8) return 'summer'; // 夏季
    if (month >= 9 && month <= 11) return 'autumn'; // 秋季
    return 'winter'; // 冬季
}

function updateTheme() {
    const newTheme = getCurrentTheme();
    if (newTheme !== currentTheme) {
        currentTheme = newTheme;
        themeChangeTime = Date.now();
        // 更新主题显示
        currentThemeElement.textContent = THEMES[currentTheme].name;
    }
}

// 粒子系统函数
function createParticles(x, y, colors) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
        const speed = 2 + Math.random() * 3;
        const particle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: PARTICLE_LIFETIME,
            maxLife: PARTICLE_LIFETIME,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3 + Math.random() * 4
        };
        particles.push(particle);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // 重力
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// 颜色调整函数
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// 能力提升道具配置
const POWER_UP_DURATION = 15000; // 能力提升持续时间（毫秒）
const POWER_UP_APPEAR_CHANCE = 0.15; // 每次吃食物后出现能力提升道具的概率
const POWER_UP_TYPES = [
    { type: 'doubleScore', color: '#FFD700', name: '得分翻倍' } // 得分翻倍
];

// 主题系统配置
const THEMES = {
    spring: {
        name: '春季',
        background: '#E8F4F8',
        gridColor: '#C8E6C9',
        snakeColor: '#4CAF50',
        foodColor: '#E91E63',
        obstacleColor: '#8D6E63',
        particles: ['#E91E63', '#4CAF50', '#FFC107']
    },
    summer: {
        name: '夏季',
        background: '#FFF8E1',
        gridColor: '#FFCC80',
        snakeColor: '#FF5722',
        foodColor: '#E91E63',
        obstacleColor: '#4CAF50',
        particles: ['#E91E63', '#FF5722', '#FFC107']
    },
    autumn: {
        name: '秋季',
        background: '#FBE9E7',
        gridColor: '#D7CCC8',
        snakeColor: '#795548',
        foodColor: '#FF7043',
        obstacleColor: '#546E7A',
        particles: ['#FF7043', '#795548', '#D7CCC8']
    },
    winter: {
        name: '冬季',
        background: '#F5F5F5',
        gridColor: '#E0E0E0',
        snakeColor: '#3F51B5',
        foodColor: '#F44336',
        obstacleColor: '#9E9E9E',
        particles: ['#F44336', '#3F51B5', '#FFFFFF']
    },
    chineseNewYear: {
        name: '春节',
        background: '#FFEBEE',
        gridColor: '#FFF9C4',
        snakeColor: '#FFC107',
        foodColor: '#E91E63',
        obstacleColor: '#C62828',
        particles: ['#FFC107', '#E91E63', '#F44336']
    },
    halloween: {
        name: '万圣节',
        background: '#424242',
        gridColor: '#8D6E63',
        snakeColor: '#FF9800',
        foodColor: '#FFC107',
        obstacleColor: '#9C27B0',
        particles: ['#FFC107', '#FF9800', '#9C27B0']
    }
};

// 粒子系统
let particles = [];
const PARTICLE_LIFETIME = 60; // 粒子生命周期（帧数）
const PARTICLE_COUNT = 15; // 每次爆炸的粒子数量

// 难度设置
const speeds = {
    easy: 200,
    medium: 150,
    hard: 100,
    survival: 150 // 生存模式基础速度
};

// 初始速度倍率
let speedMultiplier = 1.0;

// 生成障碍物
function generateObstacles() {
    // 清空现有障碍物
    obstacles = [];
    
    // 根据难度和生存模式生成不同数量的静态障碍物
    let obstacleCount;
    switch (difficultySelect.value) {
        case 'easy':
            obstacleCount = 8;
            break;
        case 'medium':
            obstacleCount = 15;
            break;
        case 'hard':
            obstacleCount = 25;
            break;
        case 'survival':
            obstacleCount = 10 + (survivalLevel - 1) * 3; // 生存模式：基础10个 + 每级增加3个
            break;
        default:
            obstacleCount = 8;
    }
    
    // 生成静态障碍物
    for (let i = 0; i < obstacleCount; i++) {
        let obstaclePosition;
        let isValid;
        
        do {
            isValid = true;
            obstaclePosition = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight)
            };
            
            // 检查是否与蛇重叠
            for (let segment of snake) {
                if (segment.x === obstaclePosition.x && segment.y === obstaclePosition.y) {
                    isValid = false;
                    break;
                }
            }
            
            // 检查是否与食物重叠
            if (food.x === obstaclePosition.x && food.y === obstaclePosition.y) {
                isValid = false;
            }
            
            // 检查是否与大食物重叠
            if (bigFood && bigFood.x === obstaclePosition.x && bigFood.y === obstaclePosition.y) {
                isValid = false;
            }
            
            // 检查是否与其他障碍物重叠
            for (let obstacle of obstacles) {
                if (obstacle.x === obstaclePosition.x && obstacle.y === obstaclePosition.y) {
                    isValid = false;
                    break;
                }
            }
            
            // 确保障碍物不会出现在蛇头前方的几个格子内
            const headX = snake[0].x;
            const headY = snake[0].y;
            const safeDistance = 5; // 安全距离
            
            if (Math.abs(obstaclePosition.x - headX) < safeDistance && 
                Math.abs(obstaclePosition.y - headY) < safeDistance) {
                isValid = false;
            }
            
        } while (!isValid);
        
        obstacles.push(obstaclePosition);
    }
}



// 初始化游戏
function initGame() {
    // 初始化蛇
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    
    // 初始化方向
    direction = 'right';
    nextDirection = 'right';
    
    // 初始化分数
    score = 0;
    scoreElement.textContent = score;
    
    // 加载并显示历史最高分
    updateHighScoreDisplay();
    
    // 重置速度倍率
    speedMultiplier = 1.0;
    speedElement.textContent = speedMultiplier.toFixed(1);
    
    // 重置大食物相关状态
    bigFood = null;
    foodEatenCount = 0;
    if (bigFoodTimer) {
        clearTimeout(bigFoodTimer);
        bigFoodTimer = null;
    }
    
    // 重置能力提升状态
    powerUpActive = false;
    powerUpStartTime = null;
    if (powerUpTimer) {
        clearTimeout(powerUpTimer);
        powerUpTimer = null;
    }
    
    // 清空粒子系统
    particles = [];
    
    // 初始化生存模式
    isSurvivalMode = difficultySelect.value === 'survival';
    if (isSurvivalMode) {
        survivalLevel = 1;
        survivalTimer = 0;
        speedMultiplier = 1.0;
        document.getElementById('survival-info').classList.add('visible');
        document.getElementById('survival-level').textContent = survivalLevel;
    } else {
        document.getElementById('survival-info').classList.remove('visible');
    }
    
    // 更新大食物状态显示
    updateBigFoodStatus();
    
    // 生成食物
    generateFood();
    
    // 生成障碍物
    generateObstacles();
    
    // 设置游戏速度
    gameSpeed = speeds[difficultySelect.value] * speedMultiplier;
    
    // 重置游戏状态
    isPaused = false;
    isGameOver = false;
    isGameStarted = true;
    
    // 更新按钮状态
    startButton.disabled = true;
    pauseButton.disabled = false;
    pauseButton.textContent = '暂停';
    
    // 清除之前的游戏循环
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    // 开始游戏循环
    gameInterval = setInterval(gameLoop, gameSpeed);
    
    // 绘制初始状态
    draw();
}

// 生成食物
function generateFood() {
    // 随机生成食物位置
    let foodPosition;
    let isValid;
    
    do {
        isValid = true;
        foodPosition = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
        
        // 检查食物是否与蛇身重叠
        for (let segment of snake) {
            if (segment.x === foodPosition.x && segment.y === foodPosition.y) {
                isValid = false;
                break;
            }
        }
        
        // 检查食物是否与障碍物重叠
        for (let obstacle of obstacles) {
            if (obstacle.x === foodPosition.x && obstacle.y === foodPosition.y) {
                isValid = false;
                break;
            }
        }
        
    } while (!isValid);
    
    food = foodPosition;
}

// 游戏主循环
function gameLoop() {
    // 更新游戏状态
    update();
    
    // 绘制游戏
    draw();
}

// 生成能力提升道具
function generatePowerUp() {
    // 如果已经有能力提升道具或者正在使用能力提升，则不生成
    if (powerUp || powerUpActive) return;
    
    // 随机选择一种能力提升类型
    const powerUpTypeIndex = Math.floor(Math.random() * POWER_UP_TYPES.length);
    const selectedPowerUp = POWER_UP_TYPES[powerUpTypeIndex];
    
    // 随机生成能力提升道具位置
    let powerUpPosition;
    let isValid;
    
    do {
        isValid = true;
        powerUpPosition = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight),
            type: selectedPowerUp.type,
            color: selectedPowerUp.color,
            name: selectedPowerUp.name
        };
        
        // 检查是否与蛇重叠
        for (let segment of snake) {
            if (segment.x === powerUpPosition.x && segment.y === powerUpPosition.y) {
                isValid = false;
                break;
            }
        }
        
        // 检查是否与食物重叠
        if (food.x === powerUpPosition.x && food.y === powerUpPosition.y) {
            isValid = false;
        }
        
        // 检查是否与大食物重叠
        if (bigFood && bigFood.x === powerUpPosition.x && bigFood.y === powerUpPosition.y) {
            isValid = false;
        }
        
        // 检查是否与障碍物重叠
        for (let obstacle of obstacles) {
            if (obstacle.x === powerUpPosition.x && obstacle.y === powerUpPosition.y) {
                isValid = false;
                break;
            }
        }
        
    } while (!isValid);
    
    powerUp = powerUpPosition;
    
    // 设置能力提升道具的自动消失
    setTimeout(() => {
        if (powerUp) {
            powerUp = null;
        }
    }, 10000); // 10秒后消失
}

// 激活能力提升
function activatePowerUp(type) {
    powerUpActive = true;
    powerUpType = type;
    powerUpStartTime = Date.now(); // 记录开始时间
    
    // 设置能力提升持续时间
    if (powerUpTimer) {
        clearTimeout(powerUpTimer);
    }
    
    powerUpTimer = setTimeout(() => {
        deactivatePowerUp();
    }, POWER_UP_DURATION);
}

// 停用能力提升
function deactivatePowerUp() {
    if (!powerUpActive) return;
    
    powerUpActive = false;
    powerUpType = null;
    powerUpStartTime = null;
    
    if (powerUpTimer) {
        clearTimeout(powerUpTimer);
        powerUpTimer = null;
    }
}

// 更新游戏状态
function update() {
    // 生存模式更新
    if (isSurvivalMode) {
        survivalTimer += gameSpeed;
        
        // 每30秒增加一次难度
        if (survivalTimer >= survivalObstacleInterval) {
            survivalLevel++;
            survivalTimer = 0;
            
            // 增加速度
            speedMultiplier += survivalSpeedIncrease;
            speedElement.textContent = speedMultiplier.toFixed(1);
            
            // 重新生成障碍物（增加数量）
            generateObstacles();
            
            // 更新游戏速度
            clearInterval(gameInterval);
            gameSpeed = speeds[difficultySelect.value] / speedMultiplier;
            gameInterval = setInterval(gameLoop, gameSpeed);
            
            // 更新生存等级显示
            document.getElementById('survival-level').textContent = survivalLevel;
            
            // 显示等级提升提示
            setTimeout(() => {
                if (!isGameOver) {
                    alert(`🎉 生存模式等级提升到 ${survivalLevel}！\n障碍物增加，速度提升！`);
                }
            }, 100);
        }
    }
    
    // 更新蛇的方向
    direction = nextDirection;
    
    // 获取蛇头位置
    const head = { ...snake[0] };
    
    // 根据方向移动蛇头
    switch (direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }
    
    // 处理穿过边界
    if (head.x < 0) {
        head.x = gridWidth - 1; // 从左边界穿过到右边
    } else if (head.x >= gridWidth) {
        head.x = 0; // 从右边界穿过到左边
    }
    
    if (head.y < 0) {
        head.y = gridHeight - 1; // 从上边界穿过到下边
    } else if (head.y >= gridHeight) {
        head.y = 0; // 从下边界穿过到上边
    }
    
    // 检查是否游戏结束（碰到自己或障碍物）
    if (isCollisionWithSnake(head) || isCollisionWithObstacle(head)) {
        gameOver();
        return;
    }
    
    // 将新的头部添加到蛇身前面
    snake.unshift(head);
    
    let foodEaten = false;
    
    // 检查是否吃到普通食物
    if (head.x === food.x && head.y === food.y) {
        // 创建粒子效果
        const foodCenterX = food.x * gridSize + gridSize/2;
        const foodCenterY = food.y * gridSize + gridSize/2;
        createParticles(foodCenterX, foodCenterY, THEMES[currentTheme].particles);
        
        // 增加分数（如果有得分翻倍效果，则翻倍）
        const baseScore = 10;
        const finalScore = powerUpActive && powerUpType === 'doubleScore' ? baseScore * 2 : baseScore;
        score += finalScore;
        scoreElement.textContent = score;
        
        // 增加食物计数
        foodEatenCount++;
        
        // 更新大食物状态显示
        updateBigFoodStatus();
        
        // 生成新的食物
        generateFood();
        
        // 增加速度倍率
        speedMultiplier += 0.05;
        speedElement.textContent = speedMultiplier.toFixed(1);
        
        // 更新游戏速度
        clearInterval(gameInterval);
        gameSpeed = speeds[difficultySelect.value] / speedMultiplier;
        gameInterval = setInterval(gameLoop, gameSpeed);
        
        // 标记已吃到食物
        foodEaten = true;
        
        // 检查是否需要生成大食物
        if (foodEatenCount % BIG_FOOD_APPEAR_THRESHOLD === 0 && !bigFood) {
            generateBigFood();
        }
        

    }
    // 检查是否吃到大食物
    else if (bigFood && head.x === bigFood.x && head.y === bigFood.y) {
        // 计算大食物存在的时间（毫秒）
        const bigFoodExistTime = Date.now() - bigFoodAppearTime;
        
        // 计算分数：根据吃到大食物的速度给予奖励
        // 越快吃到分数越高，最高BIG_FOOD_MAX_SCORE分
        const timeRatio = 1 - (bigFoodExistTime / BIG_FOOD_DURATION);
        const baseBonusScore = Math.max(10, Math.floor(timeRatio * BIG_FOOD_MAX_SCORE));
        const finalBonusScore = powerUpActive && powerUpType === 'doubleScore' ? baseBonusScore * 2 : baseBonusScore;
        
        // 创建粒子效果
        const bigFoodCenterX = bigFood.x * gridSize + gridSize/2;
        const bigFoodCenterY = bigFood.y * gridSize + gridSize/2;
        createParticles(bigFoodCenterX, bigFoodCenterY, THEMES[currentTheme].particles);
        
        // 增加分数
        score += finalBonusScore;
        scoreElement.textContent = score;
        
        // 清除大食物计时器
        if (bigFoodTimer) {
            clearTimeout(bigFoodTimer);
            bigFoodTimer = null;
        }
        
        // 移除大食物
        bigFood = null;
        
        // 更新大食物状态显示
        updateBigFoodStatus();
        
        // 标记已吃到食物
        foodEaten = true;
        
        // 大食物被吃掉后，根据吃掉速度计算能力提升道具生成概率
        // 越快吃掉大食物，生成概率越高
        const powerUpChance = Math.min(0.8, POWER_UP_APPEAR_CHANCE + timeRatio * 0.6); // 最高80%概率
        
        if (Math.random() < powerUpChance && !powerUp && !powerUpActive) {
            generatePowerUp();
        }
    }
    // 检查是否吃到能力提升道具
    else if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        // 激活能力提升
        activatePowerUp(powerUp.type);
        
        // 移除能力提升道具
        powerUp = null;
        
        // 标记已吃到食物（虽然不是食物，但为了不移除尾部）
        foodEaten = true;
    }
    
    // 如果没吃到任何食物，移除尾部
    if (!foodEaten) {
        snake.pop();
    }
}

// 检查是否与蛇身碰撞
function isCollisionWithSnake(position) {
    // 从索引1开始，因为索引0是头部
    for (let i = 1; i < snake.length; i++) {
        if (position.x === snake[i].x && position.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

// 检查是否与障碍物碰撞
function isCollisionWithObstacle(position) {
    for (let obstacle of obstacles) {
        if (position.x === obstacle.x && position.y === obstacle.y) {
            return true;
        }
    }
    return false;
}

// 绘制游戏
function draw() {
    // 更新主题
    updateTheme();
    
    // 获取当前主题
    const theme = THEMES[currentTheme];
    
    // 绘制动态背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, theme.background);
    gradient.addColorStop(1, adjustColor(theme.background, -20));
    
    // 添加背景动画
    backgroundOffset += 0.5;
    const pattern = ctx.createLinearGradient(0, 0, canvas.width + backgroundOffset, canvas.height + backgroundOffset);
    pattern.addColorStop(0, theme.background);
    pattern.addColorStop(0.5, adjustColor(theme.background, 10));
    pattern.addColorStop(1, theme.background);
    
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格背景
    drawGrid();
    
    // 绘制障碍物
    obstacles.forEach(obstacle => {
        const obstacleCenterX = obstacle.x * gridSize + gridSize/2;
        const obstacleCenterY = obstacle.y * gridSize + gridSize/2;
        
        // 检查坐标是否为有效数字
        if (isNaN(obstacleCenterX) || isNaN(obstacleCenterY) || !isFinite(obstacleCenterX) || !isFinite(obstacleCenterY)) {
            return; // 跳过无效坐标
        }
        
        try {
            // 障碍物 - 渐变灰色
            const obstacleGradient = ctx.createRadialGradient(
                obstacleCenterX, 
                obstacleCenterY, 
                0,
                obstacleCenterX, 
                obstacleCenterY, 
                Math.max(1, gridSize/1.5) // 确保半径大于0
            );
            obstacleGradient.addColorStop(0, '#9E9E9E');
            obstacleGradient.addColorStop(1, '#424242');
            ctx.fillStyle = obstacleGradient;
        } catch (e) {
            // 如果渐变创建失败，使用纯色
            ctx.fillStyle = '#757575';
        }
        
        // 绘制障碍物（岩石形状）
        ctx.beginPath();
        ctx.arc(
            obstacleCenterX,
            obstacleCenterY,
            Math.max(1, gridSize/2 - 1), // 确保半径大于0
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // 添加岩石纹理
        ctx.strokeStyle = '#616161';
        ctx.lineWidth = 1;
        
        // 绘制几条不规则线条模拟岩石纹理
        ctx.beginPath();
        ctx.moveTo(obstacleCenterX - gridSize/4, obstacleCenterY - gridSize/6);
        ctx.lineTo(obstacleCenterX + gridSize/6, obstacleCenterY - gridSize/5);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(obstacleCenterX - gridSize/5, obstacleCenterY + gridSize/6);
        ctx.lineTo(obstacleCenterX + gridSize/4, obstacleCenterY + gridSize/7);
        ctx.stroke();
    });
    

    
    // 绘制能力提升道具
    if (powerUp) {
        const powerUpCenterX = powerUp.x * gridSize + gridSize/2;
        const powerUpCenterY = powerUp.y * gridSize + gridSize/2;
        
        // 检查坐标是否为有效数字
        if (!isNaN(powerUpCenterX) && !isNaN(powerUpCenterY) && isFinite(powerUpCenterX) && isFinite(powerUpCenterY)) {
            try {
                // 能力提升道具 - 渐变色
                const powerUpGradient = ctx.createRadialGradient(
                    powerUpCenterX, 
                    powerUpCenterY, 
                    0,
                    powerUpCenterX, 
                    powerUpCenterY, 
                    Math.max(1, gridSize/1.8) // 确保半径大于0
                );
                powerUpGradient.addColorStop(0, powerUp.color);
                powerUpGradient.addColorStop(1, '#FFFFFF');
                ctx.fillStyle = powerUpGradient;
            } catch (e) {
                // 如果渐变创建失败，使用纯色
                ctx.fillStyle = powerUp.color;
            }
            
            // 绘制星形
            const spikes = 5;
            const outerRadius = gridSize/2 - 2;
            const innerRadius = outerRadius/2;
            
            ctx.beginPath();
            ctx.save();
            ctx.translate(powerUpCenterX, powerUpCenterY);
            ctx.rotate(Math.PI / 2 * 3);
            
            ctx.moveTo(0, -outerRadius);
            for (let i = 0; i < spikes; i++) {
                ctx.rotate(Math.PI / spikes);
                ctx.lineTo(0, -innerRadius);
                ctx.rotate(Math.PI / spikes);
                ctx.lineTo(0, -outerRadius);
            }
            
            ctx.closePath();
            ctx.fill();
            
            // 添加闪烁边框
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            
            // 添加脉动动画效果
            const pulseSize = 2 * Math.sin(Date.now() / 200) + 2;
            ctx.beginPath();
            ctx.arc(powerUpCenterX, powerUpCenterY, outerRadius + pulseSize, 0, Math.PI * 2);
            ctx.strokeStyle = powerUp.color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }
    
    // 绘制蛇
    snake.forEach((segment, index) => {
        // 确保坐标是有效的数字
        const centerX = segment.x * gridSize + gridSize/2;
        const centerY = segment.y * gridSize + gridSize/2;
        
        // 检查坐标是否为有效数字
        if (isNaN(centerX) || isNaN(centerY) || !isFinite(centerX) || !isFinite(centerY)) {
            return; // 跳过无效坐标
        }
        
        // 蛇头与蛇身使用不同颜色
        if (index === 0) {
            try {
                // 蛇头 - 渐变色
                const headGradient = ctx.createRadialGradient(
                    centerX, 
                    centerY, 
                    0,
                    centerX, 
                    centerY, 
                    Math.max(1, gridSize/1.5) // 确保半径大于0
                );
                // 如果有能力提升效果，改变蛇头颜色
                if (powerUpActive && powerUpType) {
                    const activePowerUp = POWER_UP_TYPES.find(p => p.type === powerUpType);
                    if (activePowerUp) {
                        headGradient.addColorStop(0, activePowerUp.color);
                        headGradient.addColorStop(1, '#2E7D32');
                    } else {
                        headGradient.addColorStop(0, '#4CAF50');
                        headGradient.addColorStop(1, '#2E7D32');
                    }
                } else {
                    headGradient.addColorStop(0, '#4CAF50');
                    headGradient.addColorStop(1, '#2E7D32');
                }
                ctx.fillStyle = headGradient;
            } catch (e) {
                // 如果渐变创建失败，使用纯色
                if (powerUpActive && powerUpType) {
                    const activePowerUp = POWER_UP_TYPES.find(p => p.type === powerUpType);
                    ctx.fillStyle = activePowerUp ? activePowerUp.color : '#4CAF50';
                } else {
                    ctx.fillStyle = '#4CAF50';
                }
            }
            
            // 绘制圆形蛇头
            ctx.beginPath();
            ctx.arc(
                centerX,
                centerY,
                Math.max(1, gridSize/2 - 1), // 确保半径大于0
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // 绘制眼睛
            drawSnakeEyes(segment);
        } else {
            try {
                // 蛇身 - 渐变色
                const bodyGradient = ctx.createRadialGradient(
                    centerX, 
                    centerY, 
                    0,
                    centerX, 
                    centerY, 
                    Math.max(1, gridSize/1.5) // 确保半径大于0
                );
                bodyGradient.addColorStop(0, '#8BC34A');
                bodyGradient.addColorStop(1, '#689F38');
                ctx.fillStyle = bodyGradient;
            } catch (e) {
                // 如果渐变创建失败，使用纯色
                ctx.fillStyle = '#8BC34A';
            }
            
            // 绘制圆形蛇身
            ctx.beginPath();
            ctx.arc(
                centerX,
                centerY,
                Math.max(1, gridSize/2 - 2), // 确保半径大于0
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    });
    
    // 绘制普通食物 - 苹果样式
    const foodCenterX = food.x * gridSize + gridSize/2;
    const foodCenterY = food.y * gridSize + gridSize/2;
    const foodRadius = Math.max(1, gridSize/2 - 2); // 确保半径大于0
    
    // 检查坐标是否为有效数字
    if (!isNaN(foodCenterX) && !isNaN(foodCenterY) && isFinite(foodCenterX) && isFinite(foodCenterY)) {
        try {
            // 苹果主体 - 渐变红色
            const foodGradient = ctx.createRadialGradient(
                foodCenterX - foodRadius/3, 
                foodCenterY - foodRadius/3, 
                0,
                foodCenterX, 
                foodCenterY, 
                foodRadius
            );
            foodGradient.addColorStop(0, '#FF7043');
            foodGradient.addColorStop(1, '#D84315');
            
            ctx.fillStyle = foodGradient;
        } catch (e) {
            // 如果渐变创建失败，使用纯色
            ctx.fillStyle = '#FF5722';
        }
        
        ctx.beginPath();
        ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 苹果顶部的小叶子
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        try {
            ctx.ellipse(
                foodCenterX, 
                foodCenterY - foodRadius + 2, 
                Math.max(1, foodRadius/4), 
                Math.max(1, foodRadius/2), 
                0, 
                0, 
                Math.PI * 2
            );
        } catch (e) {
            // 如果ellipse不支持，使用圆形
            ctx.arc(
                foodCenterX, 
                foodCenterY - foodRadius + 2, 
                Math.max(1, foodRadius/4),
                0,
                Math.PI * 2
            );
        }
        ctx.fill();
    }
    
    // 绘制大食物（如果存在）
    if (bigFood) {
        // 计算大食物存在的时间比例
        const bigFoodExistTime = Date.now() - bigFoodAppearTime;
        const timeRatio = 1 - (bigFoodExistTime / BIG_FOOD_DURATION);
        
        const bigFoodCenterX = bigFood.x * gridSize + gridSize/2;
        const bigFoodCenterY = bigFood.y * gridSize + gridSize/2;
        const bigFoodRadius = Math.max(1, gridSize * 0.8); // 确保半径大于0
        
        // 检查坐标是否为有效数字
        if (!isNaN(bigFoodCenterX) && !isNaN(bigFoodCenterY) && 
            isFinite(bigFoodCenterX) && isFinite(bigFoodCenterY)) {
            
            // 绘制闪烁光晕效果
            const glowSize = Math.max(1.1, 1.2 + 0.2 * Math.sin(Date.now() / 100));
            const glowOpacity = Math.max(0.1, 0.5 + 0.3 * Math.sin(Date.now() / 150));
            
            try {
                // 外部光晕
                const glowGradient = ctx.createRadialGradient(
                    bigFoodCenterX, 
                    bigFoodCenterY, 
                    0,
                    bigFoodCenterX, 
                    bigFoodCenterY, 
                    bigFoodRadius * glowSize
                );
                glowGradient.addColorStop(0, `rgba(255, 215, 0, ${glowOpacity})`);
                glowGradient.addColorStop(0.6, `rgba(255, 215, 0, ${glowOpacity/2})`);
                glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                
                ctx.fillStyle = glowGradient;
            } catch (e) {
                // 如果渐变创建失败，使用纯色
                ctx.fillStyle = `rgba(255, 215, 0, ${glowOpacity})`;
            }
            
            ctx.beginPath();
            ctx.arc(bigFoodCenterX, bigFoodCenterY, bigFoodRadius * glowSize, 0, Math.PI * 2);
            ctx.fill();
            
            try {
                // 绘制大食物主体 - 金色宝石效果
                const bigFoodGradient = ctx.createRadialGradient(
                    bigFoodCenterX - bigFoodRadius/3, 
                    bigFoodCenterY - bigFoodRadius/3, 
                    0,
                    bigFoodCenterX, 
                    bigFoodCenterY, 
                    bigFoodRadius
                );
                bigFoodGradient.addColorStop(0, '#FFF176'); // 浅金色
                bigFoodGradient.addColorStop(0.7, '#FFC107'); // 琥珀色
                bigFoodGradient.addColorStop(1, '#FF8F00'); // 深琥珀色
                
                ctx.fillStyle = bigFoodGradient;
            } catch (e) {
                // 如果渐变创建失败，使用纯色
                ctx.fillStyle = '#FFC107';
            }
            
            ctx.beginPath();
            ctx.arc(bigFoodCenterX, bigFoodCenterY, bigFoodRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制高光效果
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(
                bigFoodCenterX - bigFoodRadius/3, 
                bigFoodCenterY - bigFoodRadius/3, 
                Math.max(1, bigFoodRadius/4), 
                0, 
                Math.PI * 2
            );
            ctx.fill();
            
            // 绘制大食物剩余时间指示器（环形进度条）
            ctx.beginPath();
            ctx.arc(
                bigFoodCenterX,
                bigFoodCenterY,
                bigFoodRadius * 1.2,
                0,
                Math.PI * 2 * Math.max(0, Math.min(1, timeRatio)) // 确保角度在有效范围内
            );
            
            try {
                // 渐变色进度条
                const progressGradient = ctx.createLinearGradient(
                    bigFoodCenterX - bigFoodRadius * 1.2, 
                    bigFoodCenterY,
                    bigFoodCenterX + bigFoodRadius * 1.2, 
                    bigFoodCenterY
                );
                progressGradient.addColorStop(0, '#FF5252'); // 红色
                progressGradient.addColorStop(0.5, '#FF4081'); // 粉色
                progressGradient.addColorStop(1, '#FF5252'); // 红色
                
                ctx.strokeStyle = progressGradient;
            } catch (e) {
                // 如果渐变创建失败，使用纯色
                ctx.strokeStyle = '#FF5252';
            }
            
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }
    
    // 如果能力提升激活，显示状态
    if (powerUpActive && powerUpType) {
        // 找到对应的能力提升类型
        const activePowerUp = POWER_UP_TYPES.find(p => p.type === powerUpType);
        if (activePowerUp) {
            // 计算剩余时间
            const remainingTime = Math.ceil((POWER_UP_DURATION - (Date.now() - powerUpStartTime)) / 1000);
            
            // 绘制能力提升状态
            ctx.fillStyle = activePowerUp.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${activePowerUp.name}效果: ${remainingTime}秒`, canvas.width / 2, 20);
            

        }
    }
    
    // 如果游戏结束，显示游戏结束画面
    if (isGameOver) {
        try {
            // 半透明黑色背景
            const gameOverGradient = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                0,
                canvas.width / 2,
                canvas.height / 2,
                Math.max(1, canvas.width / 1.5) // 确保半径大于0
            );
            gameOverGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
            gameOverGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
            
            ctx.fillStyle = gameOverGradient;
        } catch (e) {
            // 如果渐变创建失败，使用纯色
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        }
        
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制游戏结束标题
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        
        // 文字阴影
        ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        try {
            // 渐变文字
            const textGradient = ctx.createLinearGradient(
                canvas.width / 2 - 100,
                canvas.height / 2 - 30,
                canvas.width / 2 + 100,
                canvas.height / 2 - 10
            );
            textGradient.addColorStop(0, '#FF5252');
            textGradient.addColorStop(0.5, '#FFEB3B');
            textGradient.addColorStop(1, '#FF5252');
            
            ctx.fillStyle = textGradient;
        } catch (e) {
            // 如果渐变创建失败，使用纯色
            ctx.fillStyle = '#FF5252';
        }
        
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
        
        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // 绘制分数
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        
        // 绘制装饰性边框
        const borderWidth = Math.min(300, canvas.width - 40); // 确保边框不超出画布
        const borderHeight = Math.min(200, canvas.height - 40);
        const borderX = (canvas.width - borderWidth) / 2;
        const borderY = (canvas.height - borderHeight) / 2 - 20;
        
        try {
            ctx.strokeStyle = textGradient;
        } catch (e) {
            ctx.strokeStyle = '#FF5252';
        }
        
        ctx.lineWidth = 3;
        
        // 绘制圆角矩形边框
        ctx.beginPath();
        try {
            // 尝试使用roundRect方法
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(borderX, borderY, borderWidth, borderHeight, 15);
            } else {
                // 手动绘制圆角矩形
                const radius = 15;
                ctx.moveTo(borderX + radius, borderY);
                ctx.lineTo(borderX + borderWidth - radius, borderY);
                ctx.quadraticCurveTo(borderX + borderWidth, borderY, borderX + borderWidth, borderY + radius);
                ctx.lineTo(borderX + borderWidth, borderY + borderHeight - radius);
                ctx.quadraticCurveTo(borderX + borderWidth, borderY + borderHeight, borderX + borderWidth - radius, borderY + borderHeight);
                ctx.lineTo(borderX + radius, borderY + borderHeight);
                ctx.quadraticCurveTo(borderX, borderY + borderHeight, borderX, borderY + borderHeight - radius);
                ctx.lineTo(borderX, borderY + radius);
                ctx.quadraticCurveTo(borderX, borderY, borderX + radius, borderY);
                ctx.closePath();
            }
        } catch (e) {
            // 如果出现错误，绘制普通矩形
            ctx.rect(borderX, borderY, borderWidth, borderHeight);
        }
        
        ctx.stroke();
        
        // 绘制游戏规则提示
        ctx.font = '16px Arial';
        ctx.fillStyle = '#FFECB3';
        ctx.fillText('蛇可以穿过边界，但碰到障碍物或自己会死亡', canvas.width / 2, canvas.height / 2 + 60);
        
        // 绘制重新开始提示
        ctx.font = '16px Arial';
        ctx.fillStyle = '#BBDEFB';
        ctx.fillText('按空格键或点击开始按钮重新开始', canvas.width / 2, canvas.height / 2 + 85);
    }
    // 如果游戏未开始，显示欢迎画面
    else if (!isGameStarted) {
        try {
            // 半透明黑色背景
            const welcomeGradient = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                0,
                canvas.width / 2,
                canvas.height / 2,
                Math.max(1, canvas.width / 1.5)
            );
            welcomeGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
            welcomeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
            
            ctx.fillStyle = welcomeGradient;
        } catch (e) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        }
        
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制欢迎标题
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        
        // 文字阴影
        ctx.shadowColor = 'rgba(33, 150, 243, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        try {
            // 渐变文字
            const textGradient = ctx.createLinearGradient(
                canvas.width / 2 - 100,
                canvas.height / 2 - 30,
                canvas.width / 2 + 100,
                canvas.height / 2 - 10
            );
            textGradient.addColorStop(0, '#2196F3');
            textGradient.addColorStop(0.5, '#4CAF50');
            textGradient.addColorStop(1, '#2196F3');
            
            ctx.fillStyle = textGradient;
        } catch (e) {
            ctx.fillStyle = '#2196F3';
        }
        
        ctx.fillText('欢迎来到贪吃蛇', canvas.width / 2, canvas.height / 2 - 30);
        
        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // 绘制游戏说明
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('点击"开始游戏"按钮开始游戏', canvas.width / 2, canvas.height / 2 + 20);
        
        // 绘制控制说明
        ctx.font = '16px Arial';
        ctx.fillStyle = '#FFECB3';
        ctx.fillText('使用方向键或WASD控制蛇的移动', canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillText('空格键暂停/继续游戏', canvas.width / 2, canvas.height / 2 + 75);
        
        // 绘制装饰性边框
        const borderWidth = Math.min(300, canvas.width - 40);
        const borderHeight = Math.min(200, canvas.height - 40);
        const borderX = (canvas.width - borderWidth) / 2;
        const borderY = (canvas.height - borderHeight) / 2 - 20;
        
        try {
            ctx.strokeStyle = textGradient;
        } catch (e) {
            ctx.strokeStyle = '#2196F3';
        }
        
        ctx.lineWidth = 3;
        
        // 绘制圆角矩形边框
        ctx.beginPath();
        try {
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(borderX, borderY, borderWidth, borderHeight, 15);
            } else {
                const radius = 15;
                ctx.moveTo(borderX + radius, borderY);
                ctx.lineTo(borderX + borderWidth - radius, borderY);
                ctx.quadraticCurveTo(borderX + borderWidth, borderY, borderX + borderWidth, borderY + radius);
                ctx.lineTo(borderX + borderWidth, borderY + borderHeight - radius);
                ctx.quadraticCurveTo(borderX + borderWidth, borderY + borderHeight, borderX + borderWidth - radius, borderY + borderHeight);
                ctx.lineTo(borderX + radius, borderY + borderHeight);
                ctx.quadraticCurveTo(borderX, borderY + borderHeight, borderX, borderY + borderHeight - radius);
                ctx.lineTo(borderX, borderY + radius);
                ctx.quadraticCurveTo(borderX, borderY, borderX + radius, borderY);
                ctx.closePath();
            }
        } catch (e) {
            ctx.rect(borderX, borderY, borderWidth, borderHeight);
        }
        
        ctx.stroke();
    }
    
    // 更新和绘制粒子
    updateParticles();
    drawParticles();
}

// 更新大食物状态显示
function updateBigFoodStatus() {
    if (bigFood) {
        // 如果大食物已经存在，显示"已出现"
        bigFoodStatusElement.textContent = "已出现";
    } else {
        // 显示当前进度
        const progress = foodEatenCount % BIG_FOOD_APPEAR_THRESHOLD;
        bigFoodStatusElement.textContent = `${progress}/${BIG_FOOD_APPEAR_THRESHOLD}`;
    }
}

// 生成大食物
function generateBigFood() {
    // 如果已经有大食物，不再生成
    if (bigFood) return;
    
    // 随机生成大食物位置
    let bigFoodPosition;
    let isValid;
    
    do {
        isValid = true;
        bigFoodPosition = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
        
        // 检查大食物是否与蛇身重叠
        for (let segment of snake) {
            if (segment.x === bigFoodPosition.x && segment.y === bigFoodPosition.y) {
                isValid = false;
                break;
            }
        }
        
        // 检查大食物是否与普通食物重叠
        if (food.x === bigFoodPosition.x && food.y === bigFoodPosition.y) {
            isValid = false;
        }
        
        // 检查大食物是否与障碍物重叠
        for (let obstacle of obstacles) {
            if (obstacle.x === bigFoodPosition.x && obstacle.y === bigFoodPosition.y) {
                isValid = false;
                break;
            }
        }
    } while (!isValid);
    
    // 设置大食物
    bigFood = bigFoodPosition;
    bigFoodAppearTime = Date.now();
    
    // 设置大食物消失计时器
    bigFoodTimer = setTimeout(() => {
        bigFood = null;
        bigFoodTimer = null;
    }, BIG_FOOD_DURATION);
}

// 绘制网格背景
function drawGrid() {
    const theme = THEMES[currentTheme];
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    
    // 绘制垂直线
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;
}

// 绘制蛇的眼睛
function drawSnakeEyes(headSegment) {
    const headCenterX = headSegment.x * gridSize + gridSize/2;
    const headCenterY = headSegment.y * gridSize + gridSize/2;
    const eyeRadius = gridSize/6;
    const eyeDistance = gridSize/4;
    
    // 根据当前方向确定眼睛位置
    let eyeOffsetX = 0;
    let eyeOffsetY = -eyeDistance; // 默认向上看
    
    if (direction === 'right') {
        eyeOffsetX = eyeDistance;
        eyeOffsetY = 0;
    } else if (direction === 'left') {
        eyeOffsetX = -eyeDistance;
        eyeOffsetY = 0;
    } else if (direction === 'down') {
        eyeOffsetX = 0;
        eyeOffsetY = eyeDistance;
    }
    
    // 绘制眼白
    ctx.fillStyle = 'white';
    
    // 左眼
    ctx.beginPath();
    ctx.arc(
        headCenterX - eyeOffsetY/2, 
        headCenterY + eyeOffsetX/2, 
        eyeRadius,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 右眼
    ctx.beginPath();
    ctx.arc(
        headCenterX + eyeOffsetY/2, 
        headCenterY - eyeOffsetX/2, 
        eyeRadius,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 绘制瞳孔
    ctx.fillStyle = 'black';
    
    // 左眼瞳孔
    ctx.beginPath();
    ctx.arc(
        headCenterX - eyeOffsetY/2 + eyeOffsetX/3, 
        headCenterY + eyeOffsetX/2 + eyeOffsetY/3, 
        eyeRadius/2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 右眼瞳孔
    ctx.beginPath();
    ctx.arc(
        headCenterX + eyeOffsetY/2 + eyeOffsetX/3, 
        headCenterY - eyeOffsetX/2 + eyeOffsetY/3, 
        eyeRadius/2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// 游戏结束
function gameOver() {
    clearInterval(gameInterval);
    
    // 清除大食物计时器
    if (bigFoodTimer) {
        clearTimeout(bigFoodTimer);
        bigFoodTimer = null;
    }
    

    
    // 清除能力提升计时器
    if (powerUpTimer) {
        clearTimeout(powerUpTimer);
        powerUpTimer = null;
    }
    
    // 更新历史最高分
    const isNewRecord = updateHighScore(score);
    
    isGameOver = true;
    startButton.disabled = false;
    pauseButton.disabled = true;
    draw(); // 绘制游戏结束画面
    
    // 如果创造了新纪录，显示提示
    if (isNewRecord) {
        setTimeout(() => {
            alert(`🎉 恭喜！你创造了新的最高分记录：${score}分！`);
        }, 100);
    }
}

// 暂停/继续游戏
function togglePause() {
    if (isGameOver) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        // 暂停游戏循环
        clearInterval(gameInterval);
        
        // 暂停大食物计时器
        if (bigFoodTimer && bigFood) {
            clearTimeout(bigFoodTimer);
            // 记录暂停时大食物已经存在的时间
            bigFoodExistTime = Date.now() - bigFoodAppearTime;
        }
        
        pauseButton.textContent = '继续';
    } else {
        // 使用当前的游戏速度继续游戏
        gameInterval = setInterval(gameLoop, gameSpeed);
        
        // 恢复大食物计时器
        if (bigFood) {
            // 更新大食物出现时间，考虑已经过去的时间
            bigFoodAppearTime = Date.now() - bigFoodExistTime;
            
            // 计算剩余时间
            const remainingTime = BIG_FOOD_DURATION - bigFoodExistTime;
            
            // 重新设置大食物计时器
            bigFoodTimer = setTimeout(() => {
                bigFood = null;
                bigFoodTimer = null;
            }, remainingTime);
        }
        
        pauseButton.textContent = '暂停';
    }
}

// 键盘控制
function handleKeydown(e) {
    // 如果游戏结束或暂停，不处理按键
    if (isGameOver || isPaused) return;
    
    // 根据按键设置下一个方向
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction !== 'down') nextDirection = 'up';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction !== 'up') nextDirection = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction !== 'right') nextDirection = 'left';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction !== 'left') nextDirection = 'right';
            break;
        case ' ': // 空格键暂停/继续
            togglePause();
            break;
    }
}

// 移动端触摸控制
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    if (isGameOver || isPaused) return;
    
    // 防止滚动页面
    e.preventDefault();
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    // 确定主要的滑动方向
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0 && direction !== 'left') {
            nextDirection = 'right';
        } else if (dx < 0 && direction !== 'right') {
            nextDirection = 'left';
        }
    } else {
        // 垂直滑动
        if (dy > 0 && direction !== 'up') {
            nextDirection = 'down';
        } else if (dy < 0 && direction !== 'down') {
            nextDirection = 'up';
        }
    }
    
    // 更新触摸起始点
    touchStartX = touchEndX;
    touchStartY = touchEndY;
}

// 事件监听
startButton.addEventListener('click', initGame);
pauseButton.addEventListener('click', togglePause);
difficultySelect.addEventListener('change', () => {
    // 更新最高分显示
    updateHighScoreDisplay();
    
    // 更新生存模式显示
    const isSurvival = difficultySelect.value === 'survival';
    if (isSurvival) {
        document.getElementById('survival-info').classList.add('visible');
        document.getElementById('survival-level').textContent = '1';
    } else {
        document.getElementById('survival-info').classList.remove('visible');
    }
    
    if (!isGameOver && !isPaused) {
        // 更新游戏速度，考虑当前速度倍率
        gameSpeed = speeds[difficultySelect.value] / speedMultiplier;
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
});

// 键盘控制
document.addEventListener('keydown', handleKeydown);

// 触摸控制
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

// 初始化历史记录显示
updateHighScoreDisplay();

// 初始化生存模式显示
const initialDifficulty = difficultySelect.value;
if (initialDifficulty === 'survival') {
    document.getElementById('survival-info').classList.add('visible');
    document.getElementById('survival-level').textContent = '1';
} else {
    document.getElementById('survival-info').classList.remove('visible');
}

// 初始化主题显示
updateTheme();
currentThemeElement.textContent = THEMES[currentTheme].name;

// 初始绘制
draw();