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
var streamUrls = [];


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
    // 首次渲染
    renderGrid();
});

/**
 * 切换布局按钮
 * @param {number} n 1~4
 */
// function changeGrid(n) {
//     screenGrid = n;
//     // 更新按钮激活状态
//     for (let i = 1; i <= 4; i++) {
//         const btn = document.getElementById(`grid-btn-${i}`);
//         if (btn) {
//             btn.classList.toggle('btn-active', i === n);
//         }
//     }
//     // 清空分页按钮
//     const pagination = document.getElementById('pagination');
//     if (pagination) {
//         const join = pagination.querySelector('.join');
//         if (join) {
//             join.innerHTML = `<a href="#1" class="join-item btn btn-active" onclick="changePage(1)">1</a>`;
//         }
//     }
//     // 清空画面
//     const screen = document.getElementById('screen');
//     if (screen) {
//         screen.innerHTML = '';
//         // 更新grid-cols
//         screen.className = `grid gap-1 grid-cols-${n}`;
//     }
//     // 重建画面和分页
//     createScreen(cameraList);
//     // 默认回到第1页
//     changePage(1);
// }

/**
 * 
 * @param {Array} List 
 */
function createScreen(List) {
    // const screen = document.querySelector('#screen');
    // const pagination = document.getElementById('pagination');
    // 计算每页显示数量
    // const perPage = screenGrid * screenGrid;
    // const pageCount = CalculatePageCount(List);
    // 清空分页按钮
    // if (pagination) {
    // const join = pagination.querySelector('.join');
    // if (join) {
    // join.innerHTML = `<a href="#1" class="join-item btn btn-active" onclick="changePage(1)">1</a>`;
    // }
    // }
    // if (pageCount > 1) {
    //     pagination.hidden = false;
    //     for (let i = 1; i < pageCount; i++) {
    //         const pageBtn = document.createElement('a');
    //         pageBtn.textContent = i + 1;
    //         pageBtn.classList.add('join-item', 'btn');
    //         pageBtn.setAttribute('href', `#${i + 1}`);
    //         pageBtn.addEventListener('click', () => {
    //             changePage(i + 1);
    //         });
    //         pagination.querySelector('.join').appendChild(pageBtn);
    //     }
    // } else {
    //     pagination.hidden = true;
    // }
    // 清空画面
    // if (screen) screen.innerHTML = '';
    // 创建所有播放器（先全部隐藏，分页时显示对应的）
    List.forEach((camera, index) => {
        // const cameraPlayer = createCameraPlayer(camera.hlsUrl);
        // if (index >= perPage) {
        //     cameraPlayer.hidden = true;
        // }
        // cameraPlayer.setAttribute('id', `camera-${index + 1}`);
        // screen.appendChild(cameraPlayer);
        streamUrls.push(camera.hlsUrl);
    });
}

/**
 * 切换分页
 * @param {number} pageNum 
 */
// function changePage(pageNum) {
//     const perPage = screenGrid * screenGrid;
//     const pageMin = (pageNum - 1) * perPage + 1;
//     const pageMax = pageNum * perPage;
//     for (let i = 1; i <= cameraList.length; i++) {
//         const el = document.getElementById(`camera-${i}`);
//         if (el) {
//             el.hidden = !(i >= pageMin && i <= pageMax);
//         }
//     }
//     // 更新分页按钮激活状态
//     const pagination = document.getElementById('pagination');
//     if (pagination) {
//         const btns = pagination.querySelectorAll('.join-item.btn');
//         btns.forEach((btn, idx) => {
//             btn.classList.toggle('btn-active', idx === pageNum - 1);
//         });
//     }
// }

/**
 * 
 * @param {Array} List 
 * 
 * @returns {Number}
 */
// function CalculatePageCount(List) {
//     const perPage = screenGrid * screenGrid;
//     const cameraCount = List.length;
//     const pageCount = Math.ceil(cameraCount / perPage);
//     return pageCount;
// }

/**
 * 
 * @param {String} cameraStreamUrl
 * 
 * @returns {HTMLElement}
 */
// function createCameraPlayer(cameraStreamUrl) {
//     const playerDOM = document.createElement('div');
//     createVideoPlayer(playerDOM, cameraStreamUrl);
//     return playerDOM;
// }

/**
 * 
 * @param {HTMLElement} playerDOM 
 * @param {String} StreamUrl 
 */
// function createVideoPlayer(playerDOM, StreamUrl) {
//     const player = videojs(`cam${i + 1}`, {
//         autoplay: true,
//         muted: true,
//         controls: false,
//         liveui: true,
//         sources: [{
//             src: StreamUrl,
//             type: 'application/x-mpegURL'
//         }]
//     });
// }

// 布局配置
const layouts = {
    1: { cols: 1, rows: 1, count: 1 },
    2: { cols: 2, rows: 2, count: 4 },
    3: { cols: 3, rows: 3, count: 9 },
    4: { cols: 4, rows: 4, count: 16 }
};
let currentLayout = 4;
let currentPage = 1;

function renderGrid() {
    // 销毁所有已初始化的 videojs 播放器
    if (window.videojs) {
        // 获取所有已初始化的播放器ID
        Object.keys(videojs.players).forEach(id => {
            try {
                videojs(id).dispose();
            } catch (e) { }
        });
    }

    const grid = document.getElementById('video-grid');
    if (!grid) {
        console.error('Grid element not found');
        return;
    }
    // 清空之前的播放器
    grid.innerHTML = '';
    // 获取当前布局配置
    const { cols, rows, count } = layouts[currentLayout];
    // 计算分页
    const totalPages = Math.ceil(streamUrls.length / count);
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    // 设置grid样式
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    grid.style.gap = '4px';
    grid.style.height = '100vh';

    // 清空并渲染当前页播放器
    grid.innerHTML = '';
    const start = (currentPage - 1) * count;
    const end = Math.min(start + count, streamUrls.length);
    for (let i = start; i < end; i++) {
        const box = document.createElement('div');
        box.className = 'video-box';
        const video = document.createElement('video');
        video.id = `cam${i + 1}`;
        video.className = 'video-js vjs-default-skin';
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        box.appendChild(video);
        grid.appendChild(box);
    }
    // 更新分页信息
    document.getElementById('page-info').textContent = `${currentPage}/${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;

    // 初始化播放器
    for (let i = start; i < end; i++) {
        const player = videojs(`cam${i + 1}`, {
            autoplay: true,
            muted: true,
            controls: false,
            liveui: true,
            sources: [{
                src: streamUrls[i],
                type: 'application/x-mpegURL'
            }]
        });
        player.on('error', () => {
            setTimeout(() => {
                player.src({
                    src: streamUrls[i],
                    type: 'application/x-mpegURL'
                });
                player.play().catch(() => { });
            }, 3000);
        });
    }
}

// 工具栏交互
document.querySelectorAll('.toolbar-btn[data-layout]').forEach(btn => {
    btn.addEventListener('click', () => {
        currentLayout = parseInt(btn.dataset.layout);
        // 激活按钮样式
        document.querySelectorAll('.toolbar-btn[data-layout]').forEach(b => {
            b.classList.remove('btn-primary', 'shadow', 'toolbar-btn-active');
        });
        btn.classList.add('btn-primary', 'shadow', 'toolbar-btn-active');
        currentPage = 1;
        renderGrid();
    });
});
document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderGrid();
    }
});
document.getElementById('next-page').addEventListener('click', () => {
    const count = layouts[currentLayout].count;
    const totalPages = Math.ceil(streamUrls.length / count);
    if (currentPage < totalPages) {
        currentPage++;
        renderGrid();
    }
});

