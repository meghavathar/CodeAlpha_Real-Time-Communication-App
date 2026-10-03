const loginForm =
    document.getElementById("loginForm");

const message =
    document.getElementById("message");


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            document.getElementById("email").value;

        const password =
            document.getElementById("password").value;


        try {

            const response =
                await fetch("/api/login", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        password
                    })
                });


            const data =
                await response.json();


            if (!response.ok) {

                message.textContent =
                    data.message;

                return;
            }


            localStorage.setItem(
                "token",
                data.token
            );


            localStorage.setItem(
                "username",
                data.username
            );


            window.location.href =
                "meeting.html";


        } catch (error) {

            message.textContent =
                "Unable to connect to server.";
        }

    }
);