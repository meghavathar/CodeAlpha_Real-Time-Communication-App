function getToken() {

    return localStorage.getItem("token");
}


function getUsername() {

    return localStorage.getItem("username");
}


function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("username");

    window.location.href =
        "login.html";
}


function checkAuthentication() {

    const token = getToken();

    if (!token) {

        window.location.href =
            "login.html";
    }
}