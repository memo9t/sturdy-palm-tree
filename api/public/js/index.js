window.onload = function () {
	fetch("/API/authenticated")
		.then((response) => response.json())
		.then((data) => {
			const menuItems = document.querySelectorAll(".nav-item");
			const loginButton = document.querySelector('a[href="/login"]');
			const registerButton = document.querySelector(
				'a[href="/register"]'
			);
			if (data.authenticated) {
				menuItems.forEach((item) => (item.style.display = "block"));
				loginButton.classList.add("d-none");
				registerButton.classList.add("d-none");
			} else {
				menuItems.forEach((item) => (item.style.display = "none"));
				loginButton.classList.remove("d-none");
				registerButton.classList.remove("d-none");
			}
		});
};