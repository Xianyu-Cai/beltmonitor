const getCameraList = async () => {
    const response = await fetch('http://localhost:8080/api/user/getMonitList');
    if (response.ok) {
        const result = await response.json();
        return result;
    } else {
        alert('获取摄像头列表失败');
        return [];
    }
};
var cameraList;
var userInfo;
var screenGrid = 3; // 当前网格布局，默认3x3


document.addEventListener("DOMContentLoaded", function () {
    const info = getCookie("userInfo");
    if (!info) {
        location.href = "/Login/";
    } else {
        userInfo = JSON.parse(info);
    };
});

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

getCameraList().then((list) => {
    cameraList = list.data;
    createScreen(cameraList);
});

/**
 * 切换布局按钮
 * @param {number} n 1~4
 */
function changeGrid(n) {
    screenGrid = n;
    // 更新按钮激活状态
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`grid-btn-${i}`);
        if (btn) {
            btn.classList.toggle('btn-active', i === n);
        }
    }
    // 清空分页按钮
    const pagination = document.getElementById('pagination');
    if (pagination) {
        const join = pagination.querySelector('.join');
        if (join) {
            join.innerHTML = `<a href="#1" class="join-item btn btn-active" onclick="changePage(1)">1</a>`;
        }
    }
    // 清空画面
    const screen = document.getElementById('screen');
    if (screen) {
        screen.innerHTML = '';
        // 更新grid-cols
        screen.className = `grid gap-1 grid-cols-${n}`;
    }
    // 重建画面和分页
    createScreen(cameraList);
    // 默认回到第1页
    changePage(1);
}

/**
 * 
 * @param {Array} List 
 */
function createScreen(List) {
    const screen = document.querySelector('#screen');
    const pagination = document.getElementById('pagination');
    // 计算每页显示数量
    const perPage = screenGrid * screenGrid;
    const pageCount = CalculatePageCount(List);
    // 清空分页按钮
    if (pagination) {
        const join = pagination.querySelector('.join');
        if (join) {
            join.innerHTML = `<a href="#1" class="join-item btn btn-active" onclick="changePage(1)">1</a>`;
        }
    }
    if (pageCount > 1) {
        pagination.hidden = false;
        for (let i = 1; i < pageCount; i++) {
            const pageBtn = document.createElement('a');
            pageBtn.textContent = i + 1;
            pageBtn.classList.add('join-item', 'btn');
            pageBtn.setAttribute('href', `#${i+1}`);
            pageBtn.addEventListener('click', () => {
                changePage(i + 1);
            });
            pagination.querySelector('.join').appendChild(pageBtn);
        }
    } else {
        pagination.hidden = true;
    }
    // 清空画面
    if (screen) screen.innerHTML = '';
    // 创建所有播放器（先全部隐藏，分页时显示对应的）
    List.forEach((camera, index) => {
        const cameraPlayer = createCameraPlayer(camera.hlsUrl);
        if (index >= perPage) {
            cameraPlayer.hidden = true;
        }
        cameraPlayer.setAttribute('id', `camera-${index + 1}`);
        screen.appendChild(cameraPlayer);
    });
}

/**
 * 切换分页
 * @param {number} pageNum 
 */
function changePage(pageNum) {
    const perPage = screenGrid * screenGrid;
    const pageMin = (pageNum - 1) * perPage + 1;
    const pageMax = pageNum * perPage;
    for (let i = 1; i <= cameraList.length; i++) {
        const el = document.getElementById(`camera-${i}`);
        if (el) {
            el.hidden = !(i >= pageMin && i <= pageMax);
        }
    }
    // 更新分页按钮激活状态
    const pagination = document.getElementById('pagination');
    if (pagination) {
        const btns = pagination.querySelectorAll('.join-item.btn');
        btns.forEach((btn, idx) => {
            btn.classList.toggle('btn-active', idx === pageNum - 1);
        });
    }
}

/**
 * 
 * @param {Array} List 
 * 
 * @returns {Number}
 */
function CalculatePageCount(List) {
    const perPage = screenGrid * screenGrid;
    const cameraCount = List.length;
    const pageCount = Math.ceil(cameraCount / perPage);
    return pageCount;
}

/**
 * 
 * @param {String} cameraStreamUrl
 * 
 * @returns {HTMLElement}
 */
function createCameraPlayer(cameraStreamUrl) {
    const playerDOM = document.createElement('div');
    createVideoPlayer(playerDOM, cameraStreamUrl);
    return playerDOM;
}

/**
 * 
 * @param {HTMLElement} playerDOM 
 * @param {String} StreamUrl 
 */
function createVideoPlayer(playerDOM, StreamUrl) {
    const player = new DPlayer({
        container: playerDOM,
        live: true,
        autoplay: false,
        theme: '#6AB5E8',
        loop: true,
        lang: 'zh-cn',
        screenshot: true,
        hotkey: true,
        preload: 'auto',
        volume: 0.7,
        mutex: true,
        video: {
            url: StreamUrl,
            type: 'hls',
        },
    });
}