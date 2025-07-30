// 获取DOM元素
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const speedElement = document.getElementById('speed');
const bigFoodStatusElement = document.getElementById('big-food-status');
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
let isGameOver = true;
let obstacles = []; // 障碍物数组
let movingObstacles = []; // 移动的障碍物数组
let obstacleMovementInterval; // 障碍物移动间隔
let powerUp = null; // 能力提升道具
let powerUpActive = false; // 是否激活能力提升
let powerUpTimer = null; // 能力提升计时器
let powerUpType = null; // 能力提升类型

// 大食物配置
const BIG_FOOD_DURATION = 10000; // 大食物持续时间（毫秒）
const BIG_FOOD_APPEAR_THRESHOLD = 3; // 每吃几个普通食物出现大食物
const BIG_FOOD_MAX_SCORE = 50; // 大食物最高分数

// 能力提升道具配置
const POWER_UP_DURATION = 8000; // 能力提升持续时间（毫秒）
const POWER_UP_APPEAR_CHANCE = 0.15; // 每次吃食物后出现能力提升道具的概率
const POWER_UP_TYPES = [
    { type: 'invincible', color: '#FFD700', name: '无敌' }, // 无敌（可穿过障碍物和自身）
    { type: 'speed', color: '#00BFFF', name: '加速' }, // 加速
    { type: 'slow', color: '#9932CC', name: '减速' } // 减速
];

// 难度设置
const speeds = {
    easy: 200,
    medium: 150,
    hard: 100
};

// 初始速度倍率
let speedMultiplier = 1.0;

// 生成障碍物
function generateObstacles() {
    // 清空现有障碍物
    obstacles = [];
    movingObstacles = [];
    
    // 根据难度生成不同数量的障碍物
    let obstacleCount;
    let movingObstacleCount;
    switch (difficultySelect.value) {
        case 'easy':
            obstacleCount = 5;
            movingObstacleCount = 1;
            break;
        case 'medium':
            obstacleCount = 8;
            movingObstacleCount = 2;
            break;
        case 'hard':
            obstacleCount = 12;
            movingObstacleCount = 3;
            break;
        default:
            obstacleCount = 5;
            movingObstacleCount = 1;
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
    
    // 生成移动障碍物
    for (let i = 0; i < movingObstacleCount; i++) {
        let obstaclePosition;
        let isValid;
        
        do {
            isValid = true;
            obstaclePosition = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight),
                direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
                color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
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
            
            // 检查是否与其他移动障碍物重叠
            for (let obstacle of movingObstacles) {
                if (obstacle.x === obstaclePosition.x && obstacle.y === obstaclePosition.y) {
                    isValid = false;
                    break;
                }
            }
            
            // 确保障碍物不会出现在蛇头前方的几个格子内
            const headX = snake[0].x;
            const headY = snake[0].y;
            const safeDistance = 7; // 移动障碍物需要更大的安全距离
            
            if (Math.abs(obstaclePosition.x - headX) < safeDistance && 
                Math.abs(obstaclePosition.y - headY) < safeDistance) {
                isValid = false;
            }
            
        } while (!isValid);
        
        movingObstacles.push(obstaclePosition);
    }
    
    // 设置移动障碍物的移动间隔
    if (obstacleMovementInterval) {
        clearInterval(obstacleMovementInterval);
    }
    
    // 根据难度设置移动速度
    let movementSpeed;
    switch (difficultySelect.value) {
        case 'easy':
            movementSpeed = 1000; // 每秒移动一次
            break;
        case 'medium':
            movementSpeed = 800;
            break;
        case 'hard':
            movementSpeed = 600;
            break;
        default:
            movementSpeed = 1000;
    }
    
    obstacleMovementInterval = setInterval(moveObstacles, movementSpeed);
}

// 移动障碍物
function moveObstacles() {
    if (isPaused || isGameOver) return;
    
    for (let obstacle of movingObstacles) {
        // 随机改变方向 (10%概率)
        if (Math.random() < 0.1) {
            obstacle.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
        }
        
        // 保存原位置用于检测碰撞
        const oldX = obstacle.x;
        const oldY = obstacle.y;
        
        // 根据方向移动
        switch (obstacle.direction) {
            case 'up':
                obstacle.y -= 1;
                break;
            case 'down':
                obstacle.y += 1;
                break;
            case 'left':
                obstacle.x -= 1;
                break;
            case 'right':
                obstacle.x += 1;
                break;
        }
        
        // 处理边界穿越
        if (obstacle.x < 0) {
            obstacle.x = gridWidth - 1;
        } else if (obstacle.x >= gridWidth) {
            obstacle.x = 0;
        }
        
        if (obstacle.y < 0) {
            obstacle.y = gridHeight - 1;
        } else if (obstacle.y >= gridHeight) {
            obstacle.y = 0;
        }
        
        // 检查是否与蛇碰撞
        for (let segment of snake) {
            if (segment.x === obstacle.x && segment.y === obstacle.y) {
                // 如果与蛇头碰撞，游戏结束
                if (segment === snake[0] && !powerUpActive) {
                    gameOver();
                    return;
                }
                // 如果与蛇身碰撞，回到原位置并改变方向
                obstacle.x = oldX;
                obstacle.y = oldY;
                obstacle.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
                break;
            }
        }
        
        // 检查是否与静态障碍物碰撞
        for (let staticObstacle of obstacles) {
            if (staticObstacle.x === obstacle.x && staticObstacle.y === obstacle.y) {
                // 回到原位置并改变方向
                obstacle.x = oldX;
                obstacle.y = oldY;
                obstacle.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
                break;
            }
        }
        
        // 检查是否与其他移动障碍物碰撞
        for (let otherObstacle of movingObstacles) {
            if (otherObstacle !== obstacle && otherObstacle.x === obstacle.x && otherObstacle.y === obstacle.y) {
                // 交换方向
                const tempDirection = obstacle.direction;
                obstacle.direction = otherObstacle.direction;
                otherObstacle.direction = tempDirection;
                
                // 回到原位置
                obstacle.x = oldX;
                obstacle.y = oldY;
                break;
            }
        }
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
    if (powerUpTimer) {
        clearTimeout(powerUpTimer);
        powerUpTimer = null;
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
        
        // 检查是否与移动障碍物重叠
        for (let obstacle of movingObstacles) {
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
    
    // 根据类型应用不同效果
    switch (type) {
        case 'invincible':
            // 无敌效果 - 在碰撞检测中处理
            break;
        case 'speed':
            // 加速效果
            speedMultiplier += 0.3;
            speedElement.textContent = speedMultiplier.toFixed(1);
            // 更新游戏速度
            clearInterval(gameInterval);
            gameSpeed = speeds[difficultySelect.value] / speedMultiplier;
            gameInterval = setInterval(gameLoop, gameSpeed);
            break;
        case 'slow':
            // 减速效果
            speedMultiplier = Math.max(0.7, speedMultiplier - 0.3);
            speedElement.textContent = speedMultiplier.toFixed(1);
            // 更新游戏速度
            clearInterval(gameInterval);
            gameSpeed = speeds[difficultySelect.value] / speedMultiplier;
            gameInterval = setInterval(gameLoop, gameSpeed);
            break;
    }
    
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
    
    // 根据类型恢复不同效果
    if (powerUpType === 'speed') {
        // 恢复速度
        speedMultiplier = Math.max(1.0, speedMultiplier - 0.3);
        speedElement.textContent = speedMultiplier.toFixed(1);
        // 更新游戏速度
        clearInterval(gameInterval);
        gameSpeed = speeds[difficultySelect.value] / speedMultiplier;
        gameInterval = setInterval(gameLoop, gameSpeed);
    } else if (powerUpType === 'slow') {
        // 恢复速度
        speedMultiplier += 0.3;
        speedElement.textContent = speedMultiplier.toFixed(1);
        // 更新游戏速度
        clearInterval(gameInterval);
        gameSpeed = speeds[difficultySelect.value] / speedMultiplier;
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
    
    powerUpActive = false;
    powerUpType = null;
    
    if (powerUpTimer) {
        clearTimeout(powerUpTimer);
        powerUpTimer = null;
    }
}

// 更新游戏状态
function update() {
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
    // 如果有无敌能力提升，则不会游戏结束
    if (!powerUpActive || powerUpType !== 'invincible') {
        if (isCollisionWithSnake(head) || isCollisionWithObstacle(head)) {
            gameOver();
            return;
        }
    }
    
    // 将新的头部添加到蛇身前面
    snake.unshift(head);
    
    let foodEaten = false;
    
    // 检查是否吃到普通食物
    if (head.x === food.x && head.y === food.y) {
        // 增加分数
        score += 10;
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
        
        // 随机生成能力提升道具
        if (Math.random() < POWER_UP_APPEAR_CHANCE && !powerUp && !powerUpActive) {
            generatePowerUp();
        }
    }
    // 检查是否吃到大食物
    else if (bigFood && head.x === bigFood.x && head.y === bigFood.y) {
        // 计算大食物存在的时间（毫秒）
        const bigFoodExistTime = Date.now() - bigFoodAppearTime;
        
        // 计算分数：根据吃到大食物的速度给予奖励
        // 越快吃到分数越高，最高BIG_FOOD_MAX_SCORE分
        const timeRatio = 1 - (bigFoodExistTime / BIG_FOOD_DURATION);
        const bonusScore = Math.max(10, Math.floor(timeRatio * BIG_FOOD_MAX_SCORE));
        
        // 增加分数
        score += bonusScore;
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
        
        // 大食物被吃掉后，有较高概率生成能力提升道具
        if (Math.random() < POWER_UP_APPEAR_CHANCE * 2 && !powerUp && !powerUpActive) {
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
    // 清空画布
    ctx.fillStyle = '#1E1E2E';
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
    
    // 绘制移动障碍物
    movingObstacles.forEach(obstacle => {
        const obstacleCenterX = obstacle.x * gridSize + gridSize/2;
        const obstacleCenterY = obstacle.y * gridSize + gridSize/2;
        
        // 检查坐标是否为有效数字
        if (isNaN(obstacleCenterX) || isNaN(obstacleCenterY) || !isFinite(obstacleCenterX) || !isFinite(obstacleCenterY)) {
            return; // 跳过无效坐标
        }
        
        try {
            // 移动障碍物 - 渐变彩色
            const obstacleGradient = ctx.createRadialGradient(
                obstacleCenterX, 
                obstacleCenterY, 
                0,
                obstacleCenterX, 
                obstacleCenterY, 
                Math.max(1, gridSize/1.5) // 确保半径大于0
            );
            obstacleGradient.addColorStop(0, obstacle.color || '#FF5722');
            obstacleGradient.addColorStop(1, '#424242');
            ctx.fillStyle = obstacleGradient;
        } catch (e) {
            // 如果渐变创建失败，使用纯色
            ctx.fillStyle = obstacle.color || '#FF5722';
        }
        
        // 绘制圆形
        ctx.beginPath();
        ctx.arc(obstacleCenterX, obstacleCenterY, gridSize/2 - 1, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加闪烁效果
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 绘制方向指示器
        ctx.beginPath();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        const arrowSize = gridSize / 4;
        let startX = obstacleCenterX;
        let startY = obstacleCenterY;
        let endX = startX;
        let endY = startY;
        
        switch (obstacle.direction) {
            case 'up':
                endY -= arrowSize;
                break;
            case 'down':
                endY += arrowSize;
                break;
            case 'left':
                endX -= arrowSize;
                break;
            case 'right':
                endX += arrowSize;
                break;
        }
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
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
            const remainingTime = Math.ceil((POWER_UP_DURATION - (Date.now() - powerUpTimer)) / 1000);
            
            // 绘制能力提升状态
            ctx.fillStyle = activePowerUp.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${activePowerUp.name}效果: ${remainingTime}秒`, canvas.width / 2, 20);
            
            // 绘制光环效果
            if (powerUpType === 'invincible') {
                // 为蛇头添加无敌光环
                const headX = snake[0].x * gridSize + gridSize/2;
                const headY = snake[0].y * gridSize + gridSize/2;
                
                ctx.beginPath();
                ctx.arc(headX, headY, gridSize, 0, Math.PI * 2);
                ctx.strokeStyle = activePowerUp.color;
                ctx.globalAlpha = 0.7;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
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
    const gridColor = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
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
    
    // 清除障碍物移动定时器
    if (obstacleMovementInterval) {
        clearInterval(obstacleMovementInterval);
        obstacleMovementInterval = null;
    }
    
    // 清除能力提升计时器
    if (powerUpTimer) {
        clearTimeout(powerUpTimer);
        powerUpTimer = null;
    }
    
    isGameOver = true;
    startButton.disabled = false;
    pauseButton.disabled = true;
    draw(); // 绘制游戏结束画面
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

// 初始绘制
draw();