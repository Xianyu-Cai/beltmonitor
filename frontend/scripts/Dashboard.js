var userInfo;
var userList = [];
var BeltState;
var AlarmEvents;
var Rules;
var CurrentCQCameraID = 0;

/**
 * @type {{id: Number, color: String}[]}
 */
var CameraColorList = [];

var EventsStatistics = {
    /**
     * @type {String[]}
     */
    duration: [],
    datasets: {
        human: {
            label: '人员',
            /**
             * @type {Number[]}
             */
            data: []
        },
        smoke: {
            label: '烟雾',
            /**
             * @type {Number[]}
             */
            data: []
        },
        offset: {
            label: '偏移',
            /**
             * @type {Number[]}
             */
            data: []
        },
        shape: {
            label: '大块',
            /**
             * @type {Number[]}
             */
            data: []
        },
        foreign: {
            label: '异物',
            /**
             * @type {Number[]}
             */
            data: []
        },
        quantity: {
            label: '煤量',
            /**
             * @type {Number[]}
             */
            data: []
        }
    }
};

const colorTagList = ['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info', 'neutral'];

document.addEventListener("DOMContentLoaded", function () {
    const info = getCookie("userInfo");
    if (!info) {
        location.href = "/Login/";
    } else {
        userInfo = JSON.parse(info);
        document.getElementById('UserName-Text').textContent = userInfo.NickName;
        document.getElementById('greeting').textContent = `你好,${userInfo.NickName}(${userInfo.UserName})@${userInfo.EMail}`
        if (userInfo.Role === 'admin') {
            document.getElementById('AdminPanel').hidden = false;
        }
        if (userInfo.Role === 'user') {
            document.getElementById('AdminPanel').hidden = true;
        }
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

/**
 * 
 * @returns {String} Current time in format "MM/DD/YYYY-HH:MM:SS"
 */
function GetTime() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${month}/${day}/${year}-${hour}:${minute}:${second}`;
}

function updateTime() {
    const formattedTime = GetTime();
    const timeElement = document.getElementById('c-time');
    const cq = document.getElementById('cq');
    if (timeElement) {
        timeElement.textContent = `现在是 ${formattedTime}`;
    }

    // 只有当选择了有效的摄像头ID时才尝试获取煤量数据
    if (cq && CurrentCQCameraID > 0) {
        fetch(`http://localhost:8080/api/coal_quantity?cameraId=${CurrentCQCameraID}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(data => {
                const coalQuantity = data.coal_quantity;
                cq.setAttribute('style', `--value:${parseInt(coalQuantity)}`);
                cq.innerText = `${coalQuantity}%`;
            })
            .catch(error => {
                console.warn("Error fetching coal quantity:", error.message);
                // 当发生错误时保持上一次的值，不更改界面
                // 如果需要设置默认值，可以取消下面两行的注释
                // cq.setAttribute('style', '--value:0');
                // cq.innerText = `N/A`;
            });
    } else if (cq && !CurrentCQCameraID) {
        // 如果没有选择摄像头，显示初始化提示
        cq.setAttribute('style', '--value:0');
        cq.innerText = `0%`;
    }
}

fetch("http://localhost:8080/api/user/getBeltState")
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    })
    .then(data => {
        BeltState = data.data;
        document.getElementById('OnlineCamera').textContent = BeltState.cameraOnline;
        document.getElementById('OnlineCameraTime').textContent = GetTime();
        document.getElementById('OfflineCamera').textContent = BeltState.cameraTotal - BeltState.cameraOnline;
        document.getElementById('OfflineCameraTime').textContent = GetTime();
        document.getElementById('TotalCamera').textContent = BeltState.cameraTotal;
        document.getElementById('TotalCameraTime').textContent = GetTime();
        document.getElementById('pend').textContent = BeltState.alarmEventPending;
        const select = document.getElementById('AlarmSearchCameraName');
        const cameraConfigSelect = document.getElementById('camera-cfg-select');
        const cameraAIConfigSelect = document.getElementById('camera-ai-cfg-select');
        cameraAIConfigSelect.innerHTML = `<option disabled selected>未选择</option>`;
        CoalQuantitySelect = document.getElementById('cq-select');
        BeltState.cameraList.forEach((camera, index) => {
            select.innerHTML += `<option value="${camera.cameraName}">${camera.cameraName}</option>`;
            cameraConfigSelect.innerHTML += `<option value=${camera.cameraID}>${camera.cameraName}</option>`;
            cameraAIConfigSelect.innerHTML += `<option value=${camera.cameraID}>${camera.cameraName}</option>`;
            CoalQuantitySelect.innerHTML += `<option value=${camera.cameraID}>${camera.cameraName}</option>`;
        });
    })
    .catch(error => console.error("Error fetching BeltState:", error));

fetch("http://localhost:8080/api/user/getAlarmEvents")
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    })
    .then(data => {
        AlarmEvents = data.data;
        document.getElementById('TotalEvents').textContent = AlarmEvents.total;
        document.getElementById('TotalEventsTime').textContent = GetTime();
        let resolved = 0, unresolved = 0;
        AlarmEvents.list.forEach((event, index) => {
            if (event.resolved) {
                resolved++;
            } else {
                unresolved++;
            }
        });
        document.getElementById('ResolvedEvents').textContent = resolved;
        document.getElementById('ResolvedEventsTime').textContent = GetTime();
        document.getElementById('UnresolvedEvents').textContent = unresolved;
        document.getElementById('UnresolvedEventsTime').textContent = GetTime();
        initializeEventsStatistics();
        initializeCharts();
        clearWarningView();
        AlarmEvents.list.forEach((event) => {
            loadWarningView([{ ID: event.eventID, Time: event.alarmTime, Type: event.alarmRule.alarmRuleName, Camera: event.cameraName, Status: event.resolved }]);
        });
    })
    .catch(error => console.error("Error fetching AlarmEvents:", error));

fetch("http://localhost:8080/api/admin/getAlarmRuleList")
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    }).then(data => {
        Rules = data.data;
        let active = 0, inactive = 0;
        Rules.forEach((rule, index) => {
            if (rule.enabled) {
                active++;
            } else {
                inactive++;
            }
        });
        document.getElementById('TotalRules').textContent = Rules.length;
        document.getElementById('TotalRulesTime').textContent = GetTime();
        document.getElementById('ActiveRules').textContent = active;
        document.getElementById('ActiveRulesTime').textContent = GetTime();
        document.getElementById('InactiveRules').textContent = inactive;
        document.getElementById('InactiveRulesTime').textContent = GetTime();
        initializeCameraRuleList();
    }).catch(error => console.error("Error fetching Rules:", error));

const initUserList = () => {
    fetch("http://localhost:8080/api/admin/getUserList")
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        }).then(data => {
            userList = data.data;
            const userListTable = document.getElementById('user-list');
            userListTable.innerHTML = '';
            userList.forEach((user, index) => {
                const role = user.role === 'admin' ? '管理员' : '普通用户';
                const name = `user-list-row-${index + 1}`;
                userListTable.innerHTML += `<tr id="${name}">
                                <th>${index + 1}</th>
                                <td><span class="user-list-label">${user.username}</span>
                                <input id="${name}-username" type="text" placeholder="请输入账号" class="input" value="${user.username}" hidden/>
                                </td>
                                <td><span class="user-list-label">******</span>
                                <input id="${name}-password" type="password" placeholder="请输入密码" class="input" hidden/>
                                </td>
                                <td><span class="user-list-label">${user.nickname}</span>
                                <input id="${name}-nickname" type="text" placeholder="请输入用户名" class="input" value="${user.nickname}" hidden/>
                                </td>
                                <td><span class="user-list-label">${role}</span>
                                <select id="${name}-role" class="select" hidden>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>
                                <option value="user" value="admin" ${user.role === 'admin' ? '' : 'selected'}>普通用户</option>
                                </select>
                                </td>
                                <td><span class="user-list-label">${user.tel}</span>
                                <input id="${name}-tel" type="text" placeholder="请输入电话" class="input" value="${user.tel}" hidden/>
                                </td>
                                <td><span class="user-list-label">${user.email}</span>
                                <input id="${name}-email" type="text" placeholder="请输入电子邮箱" class="input" value="${user.email}" hidden/>
                                </td>
                                <td>
                                    <button class="btn btn-info btn-sm" onclick="editUser(${index + 1})">编辑</button>
                                    <button class="btn btn-error btn-sm" onclick="deleteUser(${index + 1})">删除</button>
                                    <button class="btn btn-success btn-sm" hidden>保存</button>
                                    <button class="btn btn-sm" hidden>取消</button>
                                </td>
                            </tr>`;
            });
        }).catch(error => console.error("Error fetching Users:", error));
}

initUserList();

/**
 * 
 * @param {Array} cameras 
 */
function initializeCamerasColorList(cameras) {
    cameras.forEach((camera, index) => {
        CameraColorList.push({
            id: camera.id,
            color: GenerateRandomColor()
        });
    });
}

function initializeEventsStatistics() {

    const originalTimeList = AlarmEvents.list.map(event => event.alarmTime);
    const timeList = ParseTimeDuration(originalTimeList);
    EventsStatistics.duration = timeList;
    const eventCountsByDate = {};

    AlarmEvents.list.forEach(event => {
        const eventDate = event.alarmTime.substring(0, 10); // Extract date in "YYYY-MM-DD" format
        const ruleName = event.alarmRule.alarmRuleName;

        if (!eventCountsByDate[eventDate]) {
            eventCountsByDate[eventDate] = {
                human: 0,
                smoke: 0,
                offset: 0,
                shape: 0,
                foreign: 0,
                quantity: 0
            };
        }

        switch (ruleName) {
            case '人员检测':
                eventCountsByDate[eventDate].human++;
                break;
            case '烟雾检测':
                eventCountsByDate[eventDate].smoke++;
                break;
            case '偏移检测':
                eventCountsByDate[eventDate].offset++;
                break;
            case '大块检测':
                eventCountsByDate[eventDate].shape++;
                break;
            case '异物检测':
                eventCountsByDate[eventDate].foreign++;
                break;
            case '煤量检测':
                eventCountsByDate[eventDate].quantity++;
                break;
        }
    });

    EventsStatistics.duration = Object.keys(eventCountsByDate).sort();

    EventsStatistics.datasets.human.data = EventsStatistics.duration.map(date => eventCountsByDate[date].human);
    EventsStatistics.datasets.smoke.data = EventsStatistics.duration.map(date => eventCountsByDate[date].smoke);
    EventsStatistics.datasets.offset.data = EventsStatistics.duration.map(date => eventCountsByDate[date].offset);
    EventsStatistics.datasets.shape.data = EventsStatistics.duration.map(date => eventCountsByDate[date].shape);
    EventsStatistics.datasets.foreign.data = EventsStatistics.duration.map(date => eventCountsByDate[date].foreign);
    EventsStatistics.datasets.quantity.data = EventsStatistics.duration.map(date => eventCountsByDate[date].quantity);

    /**
     * 
     * @param {String[]} timeList 
     * @returns {String[]}
     */
    function ParseTimeDuration(timeList) {
        const parsedDates = timeList.map(time => new Date(time));
        const latestDate = new Date(Math.max(...parsedDates));
        const threeMonthsAgo = new Date(latestDate);
        threeMonthsAgo.setMonth(latestDate.getMonth() - 3);

        const uniqueSortedTimes = [...new Set(parsedDates)]
            .filter(date => date >= threeMonthsAgo && date <= latestDate)
            .sort((a, b) => a - b)
            .map(date => date.toISOString().replace('T', ' ').substring(0, 11));
        return uniqueSortedTimes;
    }
}

function clearWarningView() {
    // const IDTree = document.getElementById('WarningIDTree');
    const InfoTable = document.getElementById('WarningInfoTable');
    // IDTree.innerHTML = '<li class="step step-netural" data-content="ID">时间</li>';
    InfoTable.innerHTML = '';
}

/**
 * 
 * @param {{ID:Number,Time:String,Type:String,Camera:String,Status:Boolean}[]} warningList 
 */
function loadWarningView(warningList) {
    warningList.sort((a, b) => b.ID - a.ID);
    const IDTree = document.getElementById('WarningIDTree');
    const InfoTable = document.getElementById('WarningInfoTable');
    warningList.forEach((warning, index) => {
        let stepClass = 'step step-netural';
        switch (warning.Type) {
            case '人员检测':
                stepClass = 'step step-accent';
                break;
            case '烟雾检测':
                stepClass = 'step step-warning';
                break;
            case '偏移检测':
                stepClass = 'step step-error';
                break;
            case '大块检测':
                stepClass = 'step step-success';
                break;
            case '异物检测':
                stepClass = 'step step-info';
                break;
            case '煤量检测':
                stepClass = 'step step-secondary';
                break;
        }
        // IDTree.innerHTML += `<li class="${stepClass}" data-content="${warning.ID}">${warning.Time}</li>`
        const thisWarningImg = `http://localhost/images/alarm/alarm${warning.ID}.jpg`;
        // console.log(thisWarningImg);
        InfoTable.innerHTML += `
            <tr>
                <td><ul class="steps steps-vertical"><li class="${stepClass}" data-content="${warning.ID}">${warning.Time}</li></ul></td>
                <td>${warning.Type}</td>
                <td>${warning.Camera}</td>
                <td>${warning.Status ? '<div class="badge badge-success">已处理</div>' : '<div class="badge badge-error">未处理</div>'}</td>
                <td><button class="btn btn-ghost" onclick="showWarningImg('${thisWarningImg}')">查看</button></td>
                <td><button class="btn btn-ghost" onclick="handleWarning('${warning.ID}')">处理</button></td>
            </tr>
        `;
    });
}

function showUserInfo() {
    const modal = document.getElementById('CurrentUserModal');
    const userName = document.getElementById('user-username');
    const userEmail = document.getElementById('user-email');
    const userTel = document.getElementById('user-tel');
    userName.value = userInfo.NickName;
    userEmail.value = userInfo.EMail;
    userTel.value = userInfo.Tele;
    modal.showModal();
}

function saveUserInfo() {
    const userName = document.getElementById('user-username');
    const userEmail = document.getElementById('user-email');
    const userTel = document.getElementById('user-tel');
    const passwordInput = document.getElementById('user-password');
    const passwordConfirmInput = document.getElementById('user-password-confirm');

    if (passwordInput.value !== passwordConfirmInput.value) {
        alert('两次输入的密码不一致，请重新输入！');
        return;
    }

    const updatedUser = {
        username: userInfo.UserName,
        role: userInfo.Role,
        nickname: userName.value,
        tel: userTel.value,
        email: userEmail.value,
        newPassword: passwordInput.value
    }

    fetch(`http://localhost:8080/api/admin/updateUser`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedUser)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            alert('保存成功');
            initUserList();
        })
        .catch(error => console.error("Error saving user:", error));
}


function showWarningImg(imgUrl) {
    const ImgViewer = document.getElementById('ShowWarningImg');
    const Img = document.getElementById('WarningImg');
    Img.src = imgUrl;
    ImgViewer.showModal();
}

function handleWarning(id) {
    fetch(`http://localhost:8080/api/user/resolveAlarm`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventID: parseInt(id) })
    }).then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    }).then(data => {
        alert('处理成功');
    });
    fetch("http://localhost:8080/api/user/getAlarmEvents")
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            AlarmEvents = data.data;
            document.getElementById('TotalEvents').textContent = AlarmEvents.total;
            document.getElementById('TotalEventsTime').textContent = GetTime();
            let resolved = 0, unresolved = 0;
            AlarmEvents.list.forEach((event, index) => {
                if (event.resolved) {
                    resolved++;
                } else {
                    unresolved++;
                }
            });
            document.getElementById('ResolvedEvents').textContent = resolved;
            document.getElementById('ResolvedEventsTime').textContent = GetTime();
            document.getElementById('UnresolvedEvents').textContent = unresolved;
            document.getElementById('UnresolvedEventsTime').textContent = GetTime();
            clearWarningView();
            AlarmEvents.list.forEach((event) => {
                loadWarningView([{ ID: event.eventID, Time: event.alarmTime, Type: event.alarmRule.alarmRuleName, Camera: event.cameraName, Status: event.resolved }]);
            });
        })
        .catch(error => console.error("Error fetching AlarmEvents:", error));
    location.reload();
}

function ResolveALL() {
    fetch("http://localhost:8080/api/user/getAlarmEvents")
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            AlarmEvents = data.data;
            document.getElementById('TotalEvents').textContent = AlarmEvents.total;
            document.getElementById('TotalEventsTime').textContent = GetTime();
            let resolved = 0, unresolved = 0;
            AlarmEvents.list.forEach((event, index) => {
                if (event.resolved) {
                    resolved++;
                } else {
                    unresolved++;
                }
            });
            document.getElementById('ResolvedEvents').textContent = resolved;
            document.getElementById('ResolvedEventsTime').textContent = GetTime();
            document.getElementById('UnresolvedEvents').textContent = unresolved;
            document.getElementById('UnresolvedEventsTime').textContent = GetTime();
            AlarmEvents.list.forEach((event) => {
                loadWarningView([{ ID: event.eventID, Time: event.alarmTime, Type: event.alarmRule.alarmRuleName, Camera: event.cameraName, Status: event.resolved }]);
                if (!event.resolved) {
                    fetch(`http://localhost:8080/api/user/resolveAlarm`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ eventID: parseInt(event.eventID) })
                    }).then(response => {
                        if (!response.ok) {
                            throw new Error("Network response was not ok");
                        }
                        return response.json();
                    })
                }
            });
            location.reload();
        })
        .catch(error => console.error("Error fetching AlarmEvents:", error));
}

function searchWithCondition() {
    const alarmTypeMap = {
        human: '人员检测',
        smoke: '烟雾检测',
        offset: '偏移检测',
        shape: '大块检测',
        foreign: '异物检测',
        quantity: '煤量检测'
    }
    let isType, isName, isStatus, isTime1, isTime2;

    const originalSearchType = document.getElementById('AlarmSearchType').value;
    let mappedSearchType;
    if (originalSearchType === 'empty') {
        isType = false;
    } else {
        mappedSearchType = alarmTypeMap[`${originalSearchType}`];
        isType = true;
    }

    const searchCameraName = document.getElementById('AlarmSearchCameraName').value;
    if (searchCameraName === 'empty') {
        isName = false;
    } else {
        isName = true;
    }

    const searchStatus = document.getElementById('AlarmSearchStatus').value;
    if (searchStatus === 'empty') {
        isStatus = false;
    } else {
        isStatus = true;
    }

    const searchTime1 = document.getElementById('cally1').textContent;
    if (searchTime1 === '开始时间') {
        isTime1 = false;
    } else {
        isTime1 = true;
    }
    const searchTime2 = document.getElementById('cally2').textContent;
    if (searchTime2 === '结束时间') {
        isTime2 = false;
    } else {
        isTime2 = true;
    }

    console.log(isType, isName, isStatus, isTime1, isTime2);
    console.log(originalSearchType, mappedSearchType, searchCameraName, searchStatus, searchTime1, searchTime2);

    if (!isType && !isName && !isStatus && !isTime1 && !isTime2) {
        alert('请至少选择一个搜索条件');
        return;
    }

    /**
     * @type {{ID:Number,Time:String,Type:String,Camera:String,Status:Boolean}[]}
     */
    const searchResult = [];

    AlarmEvents.list.forEach((event, index) => {
        let isMatch = true;
        if (isType) {
            if (event.alarmRule.alarmRuleName !== mappedSearchType) {
                isMatch = false;
            }
        }
        if (isName) {
            if (event.cameraName !== searchCameraName) {
                isMatch = false;
            }
        }
        if (isStatus) {
            if (event.resolved !== (searchStatus === 'resolved')) {
                isMatch = false;
            }
        }
        if (isTime1) {
            if (new Date(event.alarmTime) < new Date(searchTime1)) {
                isMatch = false;
            }
        }
        if (isTime2) {
            if (new Date(event.alarmTime) > new Date(searchTime2)) {
                isMatch = false;
            }
        }
        if (isMatch) {
            searchResult.push({ ID: event.eventID, Time: event.alarmTime, Type: event.alarmRule.alarmRuleName, Camera: event.cameraName, Status: event.resolved });
        }
    });

    clearWarningView();
    loadWarningView(searchResult);

}

function resetSearch() {
    document.getElementById('AlarmSearchType').value = 'empty';
    document.getElementById('AlarmSearchCameraName').value = 'empty';
    document.getElementById('AlarmSearchStatus').value = 'empty';
    document.getElementById('cally1').textContent = '开始时间';
    document.getElementById('cally2').textContent = '结束时间';
    clearWarningView();
    AlarmEvents.list.forEach((event) => {
        loadWarningView([{ ID: event.eventID, Time: event.alarmTime, Type: event.alarmRule.alarmRuleName, Camera: event.cameraName, Status: event.resolved }]);
    });
}

function changePanel(panel) {
    const panels = document.querySelectorAll(`.dash-panel`);
    panels.forEach(p => p.hidden = true);
    document.getElementById(`${panel}-panel`).hidden = false;
}

function logout() {
    document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    location.href = "/Login/";
}

function showCameraCoalQuantity(id) {
    CurrentCQCameraID = parseInt(id) || 0;
    // 立即更新一次煤量显示
    updateTime();
}

function initializeCameraRuleList() {
    const cameraRuleList = document.getElementById('camera-cfg-rules');
    /**
     * 
     * @param {Number} id 
     * @param {String} name 
     * @returns {HTMLElement} cameraRuleControl
     */
    const generateCameraRuleControl = (id, name) => {
        const cameraRuleControl = document.createElement('label');
        cameraRuleControl.classList.add('fieldset-label');
        cameraRuleControl.innerHTML = `<input id="camera-cfg-rule-${id}" type="checkbox" class="toggle toggle-${colorTagList[id % colorTagList.length]}"/>${name}`;
        return cameraRuleControl;
    }

    Rules.forEach(rule => {
        // console.log(rule);
        const cameraRuleControl = generateCameraRuleControl(rule.alarmRuleID, rule.alarmRuleName);
        cameraRuleList.appendChild(cameraRuleControl);
    });
}

function selectCamera(id) {
    const ID = parseInt(id);
    const panel = document.getElementById('camera-cfg-panel');
    const panel_id_label = document.getElementById('camera-cfg-current-id-label');
    const panel_title = document.getElementById('camera-cfg-title');
    const panel_id = document.getElementById('camera-cfg-current-id');
    const panel_name = document.getElementById('camera-cfg-current-name');
    const panel_type = document.getElementById('camera-cfg-current-type');
    const panel_url = document.getElementById('camera-cfg-current-url');
    const saveBtn = document.getElementById('camera-cfg-save-btn');
    const addBtn = document.getElementById('camera-cfg-add-btn');
    const cancelBtn = document.getElementById('camera-cfg-cancel-btn');
    const deleteBtn = document.getElementById('camera-cfg-delete');

    Rules.forEach(rule => {
        const ruleCheckbox = document.getElementById(`camera-cfg-rule-${rule.alarmRuleID}`);
        if (ruleCheckbox) {
            ruleCheckbox.checked = false;
        }
    });

    panel.hidden = false;
    saveBtn.hidden = false;
    addBtn.hidden = true;
    cancelBtn.hidden = true;
    panel_id.hidden = false;
    panel_id_label.hidden = false;
    panel_title.textContent = '摄像头配置';
    deleteBtn.hidden = false;
    panel.setAttribute('data-current-id', ID);
    panel_id.value = ID;
    panel_name.value = BeltState.cameraList.find(camera => camera.cameraID === ID).cameraName;
    panel_type.value = BeltState.cameraList.find(camera => camera.cameraID === ID).cameraModel;
    panel_url.value = BeltState.cameraList.find(camera => camera.cameraID === ID).rtspUrl.substring(7);

    const currentRules = BeltState.cameraList.find(camera => camera.cameraID === ID).alarmRules;
    currentRules.forEach(rule => {
        const ruleCheckbox = document.getElementById(`camera-cfg-rule-${rule.alarmRuleID}`);
        if (ruleCheckbox) {
            ruleCheckbox.checked = true;
        }
    });
}

function addCamera() {
    const panel = document.getElementById('camera-cfg-panel');
    const panel_id_label = document.getElementById('camera-cfg-current-id-label');
    const panel_id = document.getElementById('camera-cfg-current-id');
    const panel_title = document.getElementById('camera-cfg-title');
    const panel_name = document.getElementById('camera-cfg-current-name');
    const panel_type = document.getElementById('camera-cfg-current-type');
    const panel_url = document.getElementById('camera-cfg-current-url');
    const saveBtn = document.getElementById('camera-cfg-save-btn');
    const addBtn = document.getElementById('camera-cfg-add-btn');
    const cancelBtn = document.getElementById('camera-cfg-cancel-btn');
    const deleteBtn = document.getElementById('camera-cfg-delete');

    panel.hidden = false;
    panel_title.textContent = '添加摄像头配置';
    saveBtn.hidden = true;
    addBtn.hidden = false;
    cancelBtn.hidden = false;
    panel_id.hidden = true;
    panel_id_label.hidden = true;
    deleteBtn.hidden = true;
    panel_name.value = '';
    panel_type.value = '';
    panel_url.value = '';
}

function cancelCameraCfg() {
    const panel = document.getElementById('camera-cfg-panel');
    const panel_id_label = document.getElementById('camera-cfg-current-id-label');
    const panel_id = document.getElementById('camera-cfg-current-id');
    const panel_title = document.getElementById('camera-cfg-title');
    const panel_name = document.getElementById('camera-cfg-current-name');
    const panel_type = document.getElementById('camera-cfg-current-type');
    const panel_url = document.getElementById('camera-cfg-current-url');
    const saveBtn = document.getElementById('camera-cfg-save-btn');
    const addBtn = document.getElementById('camera-cfg-add-btn');
    const cancelBtn = document.getElementById('camera-cfg-cancel-btn');
    const deleteBtn = document.getElementById('camera-cfg-delete');

    panel.hidden = true;
    panel_title.textContent = '添加摄像头配置';
    saveBtn.hidden = true;
    addBtn.hidden = false;
    cancelBtn.hidden = false;
    panel_id.hidden = true;
    panel_id_label.hidden = true;
    deleteBtn.hidden = true;
    panel_name.value = '';
    panel_type.value = '';
    panel_url.value = '';
}

function saveCameraCfg() {
    const panel = document.getElementById('camera-cfg-panel');
    const panel_id = document.getElementById('camera-cfg-current-id').value;
    const panel_name = document.getElementById('camera-cfg-current-name').value;
    const panel_type = document.getElementById('camera-cfg-current-type').value;
    const panel_url = `rtsp://${document.getElementById('camera-cfg-current-url').value}`;
    const rules = [];
    Rules.forEach(rule => {
        const ruleCheckbox = document.getElementById(`camera-cfg-rule-${rule.alarmRuleID}`);
        if (ruleCheckbox && ruleCheckbox.checked) {
            rules.push(rule.alarmRuleID);
        }
    });
    const saveData = {
        cameraID: parseInt(panel_id),
        cameraName: panel_name,
        latlng: [0, 0],
        cameraModel: panel_type,
        alarmRuleIDs: rules,
        rtspUrl: panel_url,
    };

    fetch(`http://localhost:8080/api/admin/updateCamera`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            alert('保存成功');
            panel.hidden = true;
            fetch("http://localhost:8080/api/user/getBeltState")
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    BeltState = data.data;
                    document.getElementById('OnlineCamera').textContent = BeltState.cameraOnline;
                    document.getElementById('OnlineCameraTime').textContent = GetTime();
                    document.getElementById('OfflineCamera').textContent = BeltState.cameraTotal - BeltState.cameraOnline;
                    document.getElementById('OfflineCameraTime').textContent = GetTime();
                    document.getElementById('TotalCamera').textContent = BeltState.cameraTotal;
                    document.getElementById('TotalCameraTime').textContent = GetTime();
                    document.getElementById('pend').textContent = BeltState.alarmEventPending;
                    const select = document.getElementById('AlarmSearchCameraName');
                    select.innerHTML = `<option value="empty" disabled selected>报警源摄像头名称</option>`;
                    const cameraConfigSelect = document.getElementById('camera-cfg-select');
                    cameraConfigSelect.innerHTML = `<option disabled selected>未选择</option>`;
                    BeltState.cameraList.forEach((camera, index) => {
                        select.innerHTML += `<option value="${camera.cameraName}">${camera.cameraName}</option>`;
                        cameraConfigSelect.innerHTML += `<option value=${camera.cameraID}>${camera.cameraName}</option>`;
                    });
                })
                .catch(error => console.error("Error fetching BeltState:", error));
        })
        .catch(error => console.error("Error saving camera config:", error));
    // console.log(saveData);
}

function addCameraCfg() {
    const panel = document.getElementById('camera-cfg-panel');
    const panel_name = document.getElementById('camera-cfg-current-name').value;
    const panel_type = document.getElementById('camera-cfg-current-type').value;
    const panel_url = `rtsp://${document.getElementById('camera-cfg-current-url').value}`;
    const rules = [];
    Rules.forEach(rule => {
        const ruleCheckbox = document.getElementById(`camera-cfg-rule-${rule.alarmRuleID}`);
        if (ruleCheckbox && ruleCheckbox.checked) {
            rules.push(rule.alarmRuleID);
        }
    });

    if (panel_name === '' || panel_type === '' || panel_url === '') {
        alert('请填写完整信息！');
        return;
    }

    const saveData = {
        cameraName: panel_name,
        latlng: [0, 0],
        cameraModel: panel_type,
        alarmRuleIDs: rules,
        rtspUrl: panel_url,
    };

    fetch(`http://localhost:8080/api/admin/addCamera`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            alert('保存成功');
            panel.hidden = true;
            fetch("http://localhost:8080/api/user/getBeltState")
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    BeltState = data.data;
                    document.getElementById('OnlineCamera').textContent = BeltState.cameraOnline;
                    document.getElementById('OnlineCameraTime').textContent = GetTime();
                    document.getElementById('OfflineCamera').textContent = BeltState.cameraTotal - BeltState.cameraOnline;
                    document.getElementById('OfflineCameraTime').textContent = GetTime();
                    document.getElementById('TotalCamera').textContent = BeltState.cameraTotal;
                    document.getElementById('TotalCameraTime').textContent = GetTime();
                    document.getElementById('pend').textContent = BeltState.alarmEventPending;
                    const select = document.getElementById('AlarmSearchCameraName');
                    select.innerHTML = `<option value="empty" disabled selected>报警源摄像头名称</option>`;
                    const cameraConfigSelect = document.getElementById('camera-cfg-select');
                    cameraConfigSelect.innerHTML = `<option disabled selected>未选择</option>`;
                    BeltState.cameraList.forEach((camera, index) => {
                        select.innerHTML += `<option value="${camera.cameraName}">${camera.cameraName}</option>`;
                        cameraConfigSelect.innerHTML += `<option value=${camera.cameraID}>${camera.cameraName}</option>`;
                    });
                })
                .catch(error => console.error("Error fetching BeltState:", error));
        })
        .catch(error => console.error("Error saving camera config:", error));
    // console.log(saveData);
}

function deleteCamera() {
    const panel = document.getElementById('camera-cfg-panel');
    const panel_id = document.getElementById('camera-cfg-current-id').value;

    if (confirm('确定删除该摄像头吗？')) {
        fetch(`http://localhost:8080/api/admin/deleteCamera`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cameraID: parseInt(panel_id) })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(data => {
                alert('删除成功');
                panel.hidden = true;
                fetch("http://localhost:8080/api/user/getBeltState")
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Network response was not ok");
                        }
                        return response.json();
                    })
                    .then(data => {
                        BeltState = data.data;
                        document.getElementById('OnlineCamera').textContent = BeltState.cameraOnline;
                        document.getElementById('OnlineCameraTime').textContent = GetTime();
                        document.getElementById('OfflineCamera').textContent = BeltState.cameraTotal - BeltState.cameraOnline;
                        document.getElementById('OfflineCameraTime').textContent = GetTime();
                        document.getElementById('TotalCamera').textContent = BeltState.cameraTotal;
                        document.getElementById('TotalCameraTime').textContent = GetTime();
                        document.getElementById('pend').textContent = BeltState.alarmEventPending;
                        const select = document.getElementById('AlarmSearchCameraName');
                        select.innerHTML = `<option value="empty" disabled selected>报警源摄像头名称</option>`;
                        const cameraConfigSelect = document.getElementById('camera-cfg-select');
                        cameraConfigSelect.innerHTML = `<option disabled selected>未选择</option>`;
                        BeltState.cameraList.forEach((camera, index) => {
                            select.innerHTML += `<option value="${camera.cameraName}">${camera.cameraName}</option>`;
                            cameraConfigSelect.innerHTML += `<option value=${camera.cameraID}>${camera.cameraName}</option>`;
                        });
                    })
                    .catch(error => console.error("Error fetching BeltState:", error));
            })
            .catch(error => console.error("Error deleting camera:", error));
    }
}

function addUser() {
    const userListTable = document.getElementById('user-list');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `<th></th>
                        <td><input id="new-username" type="text" placeholder="请输入账号" class="input"/></td>
                        <td><input id="new-password" type="password" placeholder="请输入密码" class="input"/></td>
                        <td><input id="new-nickname" type="text" placeholder="请输入用户名" class="input"/></td>
                        <td><select id="new-role" class="select">
                            <option value="admin">管理员</option>
                            <option value="user">普通用户</option>
                        </select></td>
                        <td><input id="new-tel" type="text" placeholder="请输入电话" class="input"/></td>
                        <td><input id="new-email" type="text" placeholder="请输入电子邮箱" class="input"/></td>
                        <td>
                        <button class="btn btn-success btn-sm" onclick="saveAddUser()">保存</button>
                        <button class="btn btn-sm" onclick="cancelAddAddUser()">取消</button>
                        </td>`;
    userListTable.appendChild(newRow);
}

function saveAddUser() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const nickname = document.getElementById('new-nickname').value;
    const role = document.getElementById('new-role').value;
    const tel = document.getElementById('new-tel').value;
    const email = document.getElementById('new-email').value;

    if (username === '' || password === '' || nickname === '' || tel === '' || email === '') {
        alert('请填写完整信息！');
        return;
    }

    const saveData = {
        username: username,
        role: role,
        nickname: nickname,
        tel: tel,
        email: email,
        password: password
    };

    fetch(`http://localhost:8080/api/admin/addUser`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            alert('保存成功');
            initUserList();
        })
        .catch(error => console.error("Error saving user:", error));
}

function cancelAddAddUser() {
    initUserList();
}

function editUser(index) {
    const userListTable = document.getElementById('user-list');
    const row = document.getElementById(`user-list-row-${index}`);
    const usernameInput = document.getElementById(`user-list-row-${index}-username`);
    const passwordInput = document.getElementById(`user-list-row-${index}-password`);
    const nicknameInput = document.getElementById(`user-list-row-${index}-nickname`);
    const roleSelect = document.getElementById(`user-list-row-${index}-role`);
    const telInput = document.getElementById(`user-list-row-${index}-tel`);
    const emailInput = document.getElementById(`user-list-row-${index}-email`);
    const editBtn = row.querySelector('button:nth-child(1)');
    const deleteBtn = row.querySelector('button:nth-child(2)');
    const saveBtn = row.querySelector('button:nth-child(3)');
    const cancelBtn = row.querySelector('button:nth-child(4)');

    row.querySelectorAll('.user-list-label').forEach((label, index) => {
        if (index != 0) {
            label.hidden = true;
        }
    });

    passwordInput.hidden = false;
    nicknameInput.hidden = false;
    roleSelect.hidden = false;
    telInput.hidden = false;
    emailInput.hidden = false;
    editBtn.hidden = true;
    deleteBtn.hidden = true;
    saveBtn.hidden = false;
    cancelBtn.hidden = false;

    saveBtn.onclick = () => {

        const updatedUser = {
            username: usernameInput.value,
            role: roleSelect.value,
            nickname: nicknameInput.value,
            tel: telInput.value,
            email: emailInput.value,
            newPassword: passwordInput.value
        }

        fetch(`http://localhost:8080/api/admin/updateUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedUser)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(data => {
                alert('保存成功');
                initUserList();
            })
            .catch(error => console.error("Error saving user:", error));
    }

    cancelBtn.onclick = () => {
        initUserList();
    }
}

function deleteUser(index) {
    const userListTable = document.getElementById('user-list');
    const row = document.getElementById(`user-list-row-${index}`);
    const usernameInput = document.getElementById(`user-list-row-${index}-username`);

    if (confirm(`确定删除用户 ${usernameInput.value} 吗？`)) {
        fetch(`http://localhost:8080/api/admin/deleteUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: usernameInput.value })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(data => {
                alert('删除成功');
                initUserList();
            })
            .catch(error => console.error("Error deleting user:", error));
    }
}

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
getCameraList().then((list) => {
    cameraList = list.data;
});
var player;
var canvas;
var ctx;
/**
 * @type {{x:Number,y:Number}[]}
 */
var polygonPoints = [];

function selectCameraAI(id) {
    const ID = parseInt(id);
    const StreamUrl = cameraList.find(camera => camera.cameraID === ID).hlsUrl;
    player = new DPlayer({
        container: document.getElementById('ai-cfg-live'),
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
    player.play();

    const panel = document.getElementById('camera-ai-cfg-panel');

    panel.hidden = false;

    const originalDataPointList = document.getElementById('polygon-point-list');
    const scaleInput = document.getElementById('ai-cfg-scale');
    const SmokeThreshold = document.getElementById('ai-cfg-smoke-threshold');
    const largeBlockInput = document.getElementById('ai-cfg-large-threshold');
    originalDataPointList.innerHTML = '';
    fetch(`http://localhost:8080/api/admin/getCameraAIConfig?cameraId=${ID}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            const AIConfig = data.data.data
            scaleInput.value = AIConfig.belt_scale;
            SmokeThreshold.value = AIConfig.smoke_threshold;
            largeBlockInput.value = AIConfig.large_block_radio * 100.0;
            polygonPoints = [];
            if (AIConfig.original_region) {
                const points = JSON.parse(AIConfig.original_region);
                points.forEach((point, index) => {
                    polygonPoints.push({ x: point.x, y: point.y });
                });
                genePolygonPointList();
            }
        })
        .catch(error => console.error("Error fetching AI config:", error));

    const playerDom = document.querySelector(".dplayer-video-wrap");
    const areaSize = { width: playerDom.clientWidth, height: playerDom.clientHeight };
    canvas = document.getElementById('sign-area');
    canvas.width = areaSize.width;
    canvas.height = areaSize.height;
    ctx = canvas.getContext('2d');
    capture();
    canvas.addEventListener('mousedown', CanvasEvent_down);
    canvas.addEventListener('mousemove', CanvasEvent_move);
}

function SaveAIConfig() {
    const scaleInput = document.getElementById('ai-cfg-scale');
    const SmokeThreshold = document.getElementById('ai-cfg-smoke-threshold');
    const LargeBlock = document.getElementById('ai-cfg-large-threshold').value;

    if (largeBlockInput === '' || SmokeThreshold === '') {
        alert('请填写完整信息！');
        return;
    }
    if (parseFloat(LargeBlock) < 0 || parseFloat(LargeBlock) > 100) {
        alert('大块检测阈值范围为0-100');
        return;
    }

    /**
     * 将多边形的坐标输入转换成Number,Number格式的字符串返回
     * @param {{x:Number,y:Number}[]} points 
     * @returns {String}
     */
    const getMaxRect = (points) => {
        const xList = points.map(point => point.x);
        const yList = points.map(point => point.y);
        const minX = Math.min(...xList);
        const minY = Math.min(...yList);
        const maxX = Math.max(...xList);
        const maxY = Math.max(...yList);
        return `${minX},${minY},${maxX},${maxY}`;
    };
    const AIConfig = {
        cameraId: parseInt(document.getElementById('camera-ai-cfg-select').value),
        belt_scale: parseFloat(scaleInput.value),
        person_region: getMaxRect(polygonPoints),
        original_region: JSON.stringify(polygonPoints),
        smoke_threshold: parseFloat(SmokeThreshold.value),
        large_block_radio: parseFloat(LargeBlock) / 100.0
    }
    console.log(AIConfig);
    fetch(`http://localhost:8080/api/admin/updateCameraAIConfig`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(AIConfig)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            alert('保存成功');
            cancelDrawing();
        })
        .catch(error => console.error("Error saving AI config:", error));
}

function capture() {
    const canvas = document.getElementById('sign-area');
    /**
     * @type {CanvasRenderingContext2D}
     */
    const ctx = canvas.getContext('2d');

    ctx.drawImage(player.video, 0, 0, canvas.width, canvas.height);

}

var AIConfigSignCanvasMode = '';
var AIConfigSignCanvasPoints = [];
var AIConfigSignCanvasLinesDrawn = 0;
var AIConfigSignCanvasIsDrawing = false;

function startLineDrawing() {
    AIConfigSignCanvasMode = 'line';
    AIConfigSignCanvasPoints = [];
    AIConfigSignCanvasLinesDrawn = 0;
    resetCanvas();
}

function startPolygonDrawing() {
    AIConfigSignCanvasMode = 'polygon';
    AIConfigSignCanvasPoints = [];
    polygonPoints = [];
    resetCanvas();
}

function cancelDrawing() {
    AIConfigSignCanvasMode = '';
    AIConfigSignCanvasPoints = [];
    AIConfigSignCanvasLinesDrawn = 0;
    AIConfigSignCanvasIsDrawing = false;
    resetCanvas();
}

function resetCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    capture();
}

const CanvasEvent_down = (e) => {
    if (!AIConfigSignCanvasMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (AIConfigSignCanvasMode === 'line') {
        AIConfigSignCanvasPoints.push({ x, y });
        if (AIConfigSignCanvasPoints.length % 2 === 0) {
            ctx.strokeStyle = 'lightblue';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(AIConfigSignCanvasPoints[AIConfigSignCanvasPoints.length - 2].x, AIConfigSignCanvasPoints[AIConfigSignCanvasPoints.length - 2].y);
            ctx.lineTo(AIConfigSignCanvasPoints[AIConfigSignCanvasPoints.length - 1].x, AIConfigSignCanvasPoints[AIConfigSignCanvasPoints.length - 1].y);
            ctx.stroke();

            AIConfigSignCanvasLinesDrawn++;

            if (AIConfigSignCanvasLinesDrawn === 2) {
                const len1 = Math.hypot(AIConfigSignCanvasPoints[0].x - AIConfigSignCanvasPoints[1].x, AIConfigSignCanvasPoints[0].y - AIConfigSignCanvasPoints[1].y);
                const len2 = Math.hypot(AIConfigSignCanvasPoints[2].x - AIConfigSignCanvasPoints[3].x, AIConfigSignCanvasPoints[2].y - AIConfigSignCanvasPoints[3].y);
                const ratio = Math.min(len1, len2) / Math.max(len1, len2);
                // alert('线段长度比例 (短/长): ' + ratio.toFixed(4));
                document.getElementById('ai-cfg-scale').value = ratio.toFixed(4);
                AIConfigSignCanvasMode = '';
            }
        }
    } else if (AIConfigSignCanvasMode === 'polygon') {
        AIConfigSignCanvasPoints.push({ x, y });
        ctx.strokeStyle = 'lightgreen';
        ctx.lineWidth = 2;
        resetCanvas();
        ctx.beginPath();
        ctx.moveTo(AIConfigSignCanvasPoints[0].x, AIConfigSignCanvasPoints[0].y);
        for (let i = 1; i < AIConfigSignCanvasPoints.length; i++) {
            ctx.lineTo(AIConfigSignCanvasPoints[i].x, AIConfigSignCanvasPoints[i].y);
        }
        ctx.stroke();

        console.log('坐标: ', x, y);
        // 假设canvas.width为原始宽度，canvas.height为原始高度
        const scaledX = Math.round((x / canvas.width) * 800);
        const scaledY = Math.round((y / canvas.height) * 450);
        polygonPoints.push({ x: scaledX, y: scaledY });

        if (AIConfigSignCanvasPoints.length > 2 && Math.hypot(x - AIConfigSignCanvasPoints[0].x, y - AIConfigSignCanvasPoints[0].y) < 10) {
            ctx.closePath();
            ctx.stroke();
            AIConfigSignCanvasMode = '';
            genePolygonPointList();
        }
    }
};
const CanvasEvent_move = (e) => {
    if (!AIConfigSignCanvasMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (AIConfigSignCanvasMode === 'line' && AIConfigSignCanvasPoints.length % 2 === 1) {
        resetCanvas();
        ctx.strokeStyle = 'lightblue';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(AIConfigSignCanvasPoints[AIConfigSignCanvasPoints.length - 1].x, AIConfigSignCanvasPoints[AIConfigSignCanvasPoints.length - 1].y);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (AIConfigSignCanvasMode === 'polygon' && AIConfigSignCanvasPoints.length > 0) {
        resetCanvas();
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(AIConfigSignCanvasPoints[0].x, AIConfigSignCanvasPoints[0].y);
        for (let i = 1; i < AIConfigSignCanvasPoints.length; i++) {
            ctx.lineTo(AIConfigSignCanvasPoints[i].x, AIConfigSignCanvasPoints[i].y);
        }
        ctx.lineTo(x, y);
        ctx.stroke();
    }
};

function genePolygonPointList() {
    const list = document.getElementById('polygon-point-list');
    list.innerHTML = '';
    polygonPoints.forEach((point, index) => {
        const li = document.createElement('li');
        li.textContent = `点 ${index + 1}: (${point.x}, ${point.y})`;
        list.appendChild(li);
    });
}

function initializeCharts() {
    ThisChart(
        document.getElementById('chart-1'),
        EventsStatistics.duration,
        [
            {
                label: EventsStatistics.datasets.human.label,
                data: EventsStatistics.datasets.human.data
            },
        ]
    );
    ThisChart(
        document.getElementById('chart-2'),
        EventsStatistics.duration,
        [
            {
                label: EventsStatistics.datasets.smoke.label,
                data: EventsStatistics.datasets.smoke.data
            },
        ]
    );
    ThisChart(
        document.getElementById('chart-3'),
        EventsStatistics.duration,
        [
            {
                label: EventsStatistics.datasets.offset.label,
                data: EventsStatistics.datasets.offset.data
            },
        ]
    );
    ThisChart(
        document.getElementById('chart-4'),
        EventsStatistics.duration,
        [
            {
                label: EventsStatistics.datasets.shape.label,
                data: EventsStatistics.datasets.shape.data
            },
        ]
    );
    ThisChart(
        document.getElementById('chart-5'),
        EventsStatistics.duration,
        [
            {
                label: EventsStatistics.datasets.foreign.label,
                data: EventsStatistics.datasets.foreign.data
            },
        ]
    );
    // ThisChart(
    //     document.getElementById('chart-6'),
    //     EventsStatistics.duration,
    //     [
    //         {
    //             label: EventsStatistics.datasets.quantity.label,
    //             data: EventsStatistics.datasets.quantity.data
    //         },
    //     ]
    // );
}

updateTime();
setInterval(updateTime, 1000);
