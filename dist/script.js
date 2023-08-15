window.addEventListener("DOMContentLoaded",app);

function app() {
	var form = document.querySelector("form"),
		imgUpload = document.getElementsByName("img_upload")[0],
		imgName = document.getElementsByName("img_name")[0],
		canvas = document.createElement("canvas"),
		c = canvas.getContext("2d"),

		scene,
		camera,
		renderer,
		textureLoader = new THREE.TextureLoader(),

		pinGeo = new THREE.Geometry(),
		pinMat = new THREE.PointsMaterial({
			map: textureLoader.load("https://i.ibb.co/ChrLnXP/pin.png"),
			size: 1.5,
  			transparent: true
		}),
		img = null,
		pinsPerSide = 100,
		pinsShouldMove = false,
		pinZPositions = [],

		adjustWindow = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth,window.innerHeight);
		},
		getLightness = (R,G,B) => {
			let r = R / 255,
				g = G / 255,
				b = B / 255,
				cmin = Math.min(r,g,b),
				cmax = Math.max(r,g,b),
				light = (cmax + cmin) / 2;

			light = Math.round(light * 100);

			return light;
		},
		handleImgUpload = e => {
			return new Promise((resolve,reject) => {
				let target = !e ? imgUpload : e.target;
				if (target.files.length) {
					let reader = new FileReader();
					reader.onload = e2 => {
						img = new Image();
						img.src = e2.target.result;
						img.onload = () => {
							resolve();
						};
						img.onerror = () => {
							img = null;
							reject("Image nullified due to file corruption or non-image upload");
						};
						imgName.placeholder = target.files[0].name;
					};
					reader.readAsDataURL(target.files[0]);
				}
			});
		},
		imgUploadValid = () => {
			let files = imgUpload.files,
				fileIsThere = files.length > 0,
				isImage = files[0].type.match("image.*"),
				valid = fileIsThere && isImage;

			return valid;
		},
		init = () => {
			// setup
			scene = new THREE.Scene();
			camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
			renderer = new THREE.WebGLRenderer();
			renderer.setClearColor(new THREE.Color(0x000000));
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.shadowMap.enabled = true;
			let camControls = new THREE.OrbitControls(camera,renderer.domElement);

			// pins
			for (let y = pinsPerSide - 1; y >= 0; --y) {
				for (let x = 0; x < pinsPerSide; ++x) {
					let center = pinsPerSide/2 - 0.5,
						pin = new THREE.Vector3();

					pin.x = x - center;
					pin.y = y - center;

					if (x % 2 == 1)
						pin.y += 0.5;

					pinGeo.vertices.push(pin);
					pinZPositions.push(0);
				}
			}
			let pins = new THREE.Points(pinGeo,pinMat);
			pins.name = "Pins";
			scene.add(pins);
			
			// camera
			camera.position.set(45,0,105);
			camera.lookAt(scene.position);
			
			// render
			let body = document.body;
			body.insertBefore(renderer.domElement,body.childNodes[4]);
			renderScene();

			// deal with preserved input
			if (imgUpload.value != "")
				renderPromise();
		},
		movePins = () => {
			pinZPositions.forEach((zPos,i) => {
				let vertex = pinGeo.vertices[i];

				if (vertex.z > zPos) {
					--vertex.z;
					if (vertex.z <= zPos)
						vertex.z = zPos;

				} else if (vertex.z < zPos) {
					++vertex.z;
					if (vertex.z >= zPos)
						vertex.z = zPos;
				}
			});
			pinGeo.verticesNeedUpdate = true;

			// stop moving pins when all are in their new positions
			if (pinZPositions.every((z,i) => z == pinGeo.vertices[i].z))
				pinsShouldMove = false;
		},
		renderPromise = e => {
			handleImgUpload(e).then(() => {
				if (imgUploadValid()) {
					updateCanvas();
					updateImg();

					setTimeout(() => {
						pinsShouldMove = true;
					}, 300);
				}
					
			}).catch(msg => {
				console.log(msg);
			});
		},
		renderScene = () => {
			if (pinsShouldMove)
				movePins();

			renderer.render(scene,camera);
			requestAnimationFrame(renderScene);
		},
		updateCanvas = () => {
			// restrict image size, keep it proportional
			let imgWidth = img.width,
				imgHeight = img.height;

			if (imgWidth >= imgHeight) {
				if (imgWidth >= pinsPerSide) {
					imgWidth = pinsPerSide;
					imgHeight = imgWidth * (img.height / img.width);
				}
			} else {
				if (imgHeight >= pinsPerSide) {
					imgHeight = pinsPerSide;
					imgWidth = imgHeight * (img.width / img.height);
				}
			}

			// update canvas
			c.clearRect(0,0,pinsPerSide,pinsPerSide);

			let imgX = pinsPerSide/2 - imgWidth/2,
				imgY = pinsPerSide/2 - imgHeight/2;

			c.drawImage(img,imgX,imgY,imgWidth,imgHeight);
		},
		updateImg = () => {
			let imgData = c.getImageData(0,0,pinsPerSide,pinsPerSide),
				data = imgData.data;

			for (let i = 0; i < data.length; i += 4) {
				let lightness = getLightness(data[i],data[i + 1],data[i + 2]),
					pinDistance = lightness / 5;

				pinZPositions[i/4] = pinDistance;
			}
		};

	init();
	imgUpload.addEventListener("change",renderPromise);
	window.addEventListener("resize",adjustWindow);
}