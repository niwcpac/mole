
// alert('If you see this alert, then your custom JavaScript script has run!')

function addScript(url) {
	var script = document.createElement('script');
	script.type = 'application/javascript';
	script.src = url;
	document.head.appendChild(script);
    }

addScript('/report/assets/html2pdf.bundle.min.js');
