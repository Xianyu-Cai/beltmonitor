document.querySelector('button').addEventListener('click', async () => {
    const UserName = document.querySelector('input[type="text"]').value;
    const Password = document.querySelector('input[type="password"]').value;
    const errorMessage = document.querySelector('#error-message');
    const loginText = document.querySelector('#login-text');
    const loginLoading = document.querySelector('#login-loading');

    if (UserName === '' || Password === '') {
        errorMessage.textContent = '账号或密码不能为空';
    } else {
        errorMessage.textContent = '';
        loginText.hidden = true;
        loginLoading.hidden = false;

        const response = await fetch('http://localhost:8080/api/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: UserName, password: Password })
        });

        loginText.hidden = false;
        loginLoading.hidden = true;

        if (response.ok) {
            const result = await response.json();
            if (result.data.success) {
                console.log(result);
                const userInfo = {
                    NickName: result.data.userInfo.nickname,
                    UserName: result.data.userInfo.username,
                    Role: result.data.userInfo.role,
                    Tele: result.data.userInfo.tel,
                    EMail: result.data.userInfo.email,
                    isLogin: true
                };
                console.log(userInfo);
                document.cookie = `userInfo=${JSON.stringify(userInfo)}; max-age=${4 * 60 * 60}; path=/`;
                window.location.href = '/Monitor/';
            } else {
                errorMessage.textContent = '账号或密码错误';
            }
        } else {
            errorMessage.textContent = '登录失败，请稍后再试';
        }
    }
});