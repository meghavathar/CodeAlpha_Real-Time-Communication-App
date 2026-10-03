const registerForm =
    document.getElementById("registerForm");

const message =
    document.getElementById("message");


registerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const username =
            document.getElementById("username").value;

        const email =
            document.getElementById("email").value;

        const password =
            document.getElementById("password").value;


        try {

            const response =
                await fetch("/api/register", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        username,
                        email,
                        password
                    })
                });


            const data =
                await response.json();


            message.textContent =
                data.message;


            if (response.ok) {

                setTimeout(() => {

                    window.location.href =
                        "login.html";

                }, 1000);
            }


        } catch (error) {

            message.textContent =
                "Server connection failed.";
        }

    }
);