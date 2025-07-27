import { blockDefinitions, orientations, fontTexture } from './definitions.js';
window.location.href = '/maintenance.html';
document.addEventListener('DOMContentLoaded', () => {

	// --- Image Container ---
	const imageContainer = document.getElementById('imageContainer');
	const imageInput = document.getElementById('imageInput');
	const uploadedImage = document.getElementById('uploadedImage');
	const imageDisplay = document.getElementById('imageDisplay');
	const message = document.getElementById('message');
	const uploadButton = document.getElementById('uploadButton');
	const generateButton = document.getElementById('generateButton');
	
	// --- Info View & Edit Title ---
	const infoView = document.getElementById('infoView');
	const displayTitle = document.getElementById('displayTitle');
	const displayAuthor = document.getElementById('displayAuthor');
	const editTitleButton = document.getElementById('editTitleButton');
	
	const editTitle = document.getElementById('editTitle');
	const editTitleInput = document.getElementById('editTitleInput');
	const saveTitleButton = document.getElementById('saveTitleButton');
	const cancelTitleButton = document.getElementById('cancelTitleButton');
	
	// --- Blocks View & Replace ---
	const blockSummaryContainer = document.getElementById('blockSummaryContainer');
	const propertiesContainer = document.getElementById('propertiesContainer');
	const selectAll = document.getElementById('selectAll');
	const backPropertyButton = document.getElementById('backPropertyButton');
	const changePropertyButton = document.getElementById('changePropertyButton');
	
	const newBlockSelection = document.getElementById('newBlockSelection');
	const selectDescription = document.getElementById('selectDescription');
	const newBlockType = document.getElementById('newBlockType');
	const newOrientation = document.getElementById('newOrientation');
	const newTexture = document.getElementById('newTexture');
	const cancelNewButton = document.getElementById('cancelNewButton');
	const saveNewButton = document.getElementById('saveNewButton');
	
	// --- Global Data Storage ---
	let byteSegments;
	let mekoBlocks;
	let selectedValue;
	
	// --- Utils Function ---
	function bytesToText(bytes) {
		return new TextDecoder('utf-8').decode(bytes);
	}
	
	function textToBytes(text) {
		return new TextEncoder().encode(text);
	}
	
	function scrollTo(element) {
		const a = document.createElement('a');
		a.href = "#" + element.id;
		a.click();
	}
	
	function createCanvas(width, height) {
		const cvs = document.createElement('canvas');
		const ctx = cvs.getContext('2d');
		cvs.width = width;
		cvs.height = height;
		return [cvs, ctx];
	}
	
	// --- Show & Hidden Function ---
	function show(element) {
		element.classList.remove('hidden');
	}
	
	function hide(element) {
		element.classList.add('hidden');
	}
	
	function showImage(img) {
		const naturalWidth = img.naturalWidth;
		const naturalHeight = img.naturalHeight;
		const canvasWidth = imageDisplay.offsetWidth;
		let targetHeight = (canvasWidth / naturalWidth) * naturalHeight;
		targetHeight = Math.min(targetHeight, 350);
		imageDisplay.style.height = targetHeight + "px";
		imageDisplay.style.opacity = "1";
	}
	
	function clearData() {
		hide(infoView);
		hide(editTitle);
		hide(blockSummaryContainer);
		hide(propertiesContainer);
		hide(newBlockSelection);
		displayTitle.textContent = null;
		displayAuthor.textContent = null;
		byteSegments = null;
		mekoBlocks = null;
		selectedValue = null;
		uploadedImage.src = null;
		imageDisplay.style = "height: 0px; opacity: 0;"
	}
	
	// --- Data Processing Function ---
	function getData() {
		const level = byteSegments.slice(4);
		
		let mekoLevel;
		try {
			mekoLevel = pako.inflate(level);
		} catch (pakoError) {
			alert('Failed to decompress level data with Pako. Ensure this is a valid and uncorrupted Mekorama QR.');
			console.error('Pako Decompression Error:', pakoError);
			message.textContent = 'Failed to decompress level data. Error: ' + pakoError.message;
			return;
		}
		
		// -- get title, author, blocks --
		let offset = 0;
		const titleLength = mekoLevel[offset++];
		const title = mekoLevel.slice(offset, offset + titleLength);
		displayTitle.textContent = bytesToText(title);
		
		offset += titleLength;
		const authorLength = mekoLevel[offset++];
		const author = mekoLevel.slice(offset, offset + authorLength);
		displayAuthor.textContent = bytesToText(author);
		
		offset += authorLength;
		const blocks = Array.from(mekoLevel.slice(offset));
		
		lenFixed(blocks);
		if (blocks.length === 4096) {
			mekoBlocks = blocks;
			message.textContent = 'QR Code successfully decoded and level data processed!';
		} else {
			alert (`Blocks length ${blocks.length}. Expect length 4096.`);
			message.textContent = 'This is not mekorama data.'
			return;
		}
		
		show(infoView);
		displayBlocks();
		scrollTo(blockCards);
	}
	
	function lenFixed(array) {
		for (let i = 0; i < array.length; i++) {
			const bd = blockDefinitions[array[i]];
			
			if (bd.isOriented && bd.isTextured) {
				array.splice(i, 3, [array[i], array[i+1], array[i+2]]);
			} else if (bd.isOriented || bd.isTextured) {
				array.splice(i, 2, [array[i], array[i+1]]);
			} else {
				array.splice(i, 1, [array[i]]);
			}
		}
	}
	
	function displayBlocks() {
		blockCards.innerHTML = null;
		
		let blockType = {};
		mekoBlocks.forEach(val => {
			if (!blockType[val[0]]) {
				blockType[val[0]] = {
					value: val[0],
					count: 0
				}
			}
			blockType[val[0]].count++;
		})
		
		const sortedBlockType = Object.values(blockType).sort((a, b) => a.value - b.value);
		sortedBlockType.forEach(block => {
			const card = document.createElement('div');
			card.classList.add('decoded-card');
			
			const blockName = blockDefinitions[block.value].name;
			card.innerHTML = `
				<p><strong>${blockName}</strong></p>
				<p>Count: ${block.count}</p>
			`;
			card.addEventListener('click', () => {
				selectedValue = block.value;
				displayProperties();
			})
			blockCards.appendChild(card);
		})
		
		show(blockSummaryContainer);
	}
	
	function displayProperties() {
		propertyCards.innerHTML = null;
		
		mekoBlocks.forEach((val, idx) => {
			if (val[0] !== selectedValue) {
				return;
			}
			
			const x = 1 + (idx % 16);
			const y = 1 + (Math.floor((idx % 256) / 16));
			const z = 1 + (Math.floor(idx / 256));
			
			const coord = `C${x}F${y}L${z}`;
			
			let attrName;
			const bd = blockDefinitions[val[0]];
			
			if (bd.isOriented && bd.isTextured) {
				attrName = `${orientations[val[1]].toUpperCase()}<br>Texture Value: ${val[2]}`;
			} else if (bd.isOriented && !bd.isTextured) {
				attrName = `${orientations[val[1]].toUpperCase()}`;
			} else if (!bd.isOriented && bd.isTextured) {
				attrName = `Texture Value: ${val[1]}`;
			} else {
				attrName = `"NO ATTRIBUTES"`
			}
			
			const card = document.createElement('div');
			card.classList.add('decoded-card', 'property-card');
			card.dataset.index = idx;
			
			card.innerHTML += `<p>${coord}</p>`;
			if (val[1] !== undefined) {
				card.innerHTML += `<p><small>${attrName}</small></p>`;
			}
			
			card.addEventListener('click', () => {
				card.classList.toggle('active');
				updateSelectAll();
			})
			propertyCards.appendChild(card);
		})
		updateSelectAll();
		hide(blockSummaryContainer);
		show(propertiesContainer);
	}
	
	function updateSelectAll() {
		const activeCard = propertyCards.querySelectorAll('.active');
		selectAll.checked = activeCard.length === propertyCards.children.length ? true : false;
	}
	
	selectAll.onchange = (e) => {
		const queryCard = propertyCards.querySelectorAll('.property-card');
		queryCard.forEach(card => {
			if (e.target.checked) {
				card.classList.add('active');
			} else {
				card.classList.remove('active');
			}
		})
	}
	
	backPropertyButton.addEventListener('click', () => {
		hide(propertiesContainer);
		show(blockSummaryContainer);
	})
	
	changePropertyButton.addEventListener('click', displayNewSelection)
	
	function createDropdown(element, options) {
		const noneOption = document.createElement('option');
		noneOption.value = null;
		noneOption.textContent = '-- Select --';
		element.appendChild(noneOption);
		
		options.forEach ((opt, val) => {
			const option = document.createElement('option');
			option.value = val;
			if (typeof opt === 'object') {
				option.textContent = opt.name;
			} else if (typeof opt === 'string') {
				option.textContent = opt.toUpperCase();
			} else {
				option.textContent = opt;
			}
			element.appendChild(option);
		})
	}
	
	createDropdown(newBlockType, blockDefinitions);
	createDropdown(newOrientation, orientations);
	createDropdown(newTexture, fontTexture);
		
	newBlockType.onchange = () => {
		const block = blockDefinitions[newBlockType.value];
		if (block.isOriented) {
			newOrientation.disabled = false;
		} else {
			newOrientation.disabled = true;
			newOrientation.value = null;
		}
		
		if (block.isTextured) {
			newTexture.disabled = false;
		} else {
			newTexture.disabled = true;
			newTexture.value = null;
		}
	}

	function displayNewSelection() {
		const activeCard = propertyCards.querySelectorAll('.active');
		if (activeCard.length === 0) {
			alert('Please select at least one block position to change.');
			return;
		}
		
		selectDescription.innerHTML = null;
		selectDescription.innerHTML = `
		<p>You are about to change ${activeCard.length} blocks.</p>
		<p><b>${blockDefinitions[selectedValue].name}</b></p>
		`;
		
		newOrientation.disabled = true;
		newTexture.disabled = true;
		
		newBlockType.value = null;
		newOrientation.value = null;
		newTexture.value = null;
		
		hide(propertiesContainer);
		show(newBlockSelection);
	}
	
	cancelNewButton.addEventListener('click', () => {
		hide(newBlockSelection);
		show(propertiesContainer);
	})
	
	saveNewButton.addEventListener('click', () => {
		const activeCard = propertyCards.querySelectorAll('.active');
		
		const newBlock = newBlockType.value;
		const newOrient = newOrientation.value;
		const newFont = newTexture.value;
		
		if (newBlock === 'null') {
			alert("Please select a New Block Type.");
			return;
		}
		
		const bd = blockDefinitions[selectedValue];
		const bdNew = blockDefinitions[parseInt(newBlock)];
		
		if (newOrient === 'null' && !newOrientation.disabled) {
			if (bd.isOriented !== bdNew.isOriented) {
				alert(`Please select a New Orientation.\n${bd.name} has not attribute Orientation.`);
				return;
			}
		}
		
		if (newFont === 'null' && !newTexture.disabled) {
			if (bd.isTextured !== bdNew.isTextured) {
				alert(`Please select a New Font Texture.\n${bd.name} has not attribute Font Texture.`);
				return;
			}
		}
		
		activeCard.forEach(card => {
			const idx = parseInt(card.dataset.index);
			mekoBlocks[idx][0] = parseInt(newBlock);
			
			if (bd.isOriented && bd.isTextured) {
				if (bdNew.isOriented && bdNew.isTextured) {
					if (newOrient !== 'null') {
						mekoBlocks[idx][1] = parseInt(newOrient);
					}
					if (newFont !== 'null') {
						mekoBlocks[idx][2] = parseInt(newFont);
					}
				} else if (bdNew.isOriented && !bdNew.isTextured) {
					mekoBlocks[idx].pop();
					if (newOrient !== 'null') {
						mekoBlocks[idx][1] = parseInt(newOrient);
					}
				} else if (!bdNew.isOriented && bdNew.isTextured) {
					const popFont = mekoBlocks[idx].pop();
					if (newFont !== 'null') {
						mekoBlocks[idx][1] = parseInt(newFont);
					} else {
						mekoBlocks[idx][1] = popFont;
					}
				} else {
					mekoBlocks[idx].pop();
					mekoBlocks[idx].pop();
				}
			
			} else if (bd.isOriented && !bd.isTextured) {
				if (bdNew.isOriented && bdNew.isTextured) {
					mekoBlocks[idx].push(parseInt(newFont));
					if (newOrient !== 'null') {
						mekoBlocks[idx][1] = parseInt(newOrient);
					}
				} else if (bdNew.isOriented && !bdNew.isTextured) {
					if (newOrient !== 'null') {
						mekoBlocks[idx][1] = parseInt(newOrient);
					}
				} else if (!bdNew.isOriented && bdNew.isTextured) {
					mekoBlocks[idx][1] = parseInt(newFont);
				} else {
					mekoBlocks[idx].pop();
				}
			
			} else if (!bd.isOriented && bd.isTextured) {
				if (bdNew.isOriented && bdNew.isTextured) {
					const popFont = mekoBlocks[idx].pop();
					mekoBlocks[idx].push(parseInt(newOrient));
					if (newFont !== 'null') {
						mekoBlocks[idx].push(parseInt(newFont));
					} else {
						mekoBlocks[idx].push(popFont);
					}
				} else if (bdNew.isOriented && !bdNew.isTextured) {
					mekoBlocks[idx][1] = parseInt(newOrient);
				} else if (!bdNew.isOriented && bdNew.isTextured) {
					if (newFont !== 'null') {
						mekoBlocks[idx][1] = parseInt(newFont);
					}
				} else {
					mekoBlocks[idx].pop();
				}
			
			} else {
				if (bdNew.isOriented && bdNew.isTextured) {
					mekoBlocks[idx].push(parseInt(newOrient));
					mekoBlocks[idx].push(parseInt(newFont));
				} else if (bdNew.isOriented && !bdNew.isTextured) {
					mekoBlocks[idx].push(parseInt(newOrient));
				} else if (!bdNew.isOriented && bdNew.isTextured) {
					mekoBlocks[idx].push(parseInt(newFont));
				}
			}
		})
		
		let confirm = `${activeCard.length} blocks successfully changed.\nClick Generate to download New QR Code.`;
		alert(confirm);
		scrollTo(imageDisplay);
		
		message.innerHTML = `${bd.name} successfully changed to ${bdNew.name}.`;
		
		hide(newBlockSelection);
		displayBlocks();
	})
	
	// --- Decode QR Code Function ---
	async function deqrcode(image) {
		if(image.src) {
			const codeReader = new ZXingBrowser.BrowserQRCodeReader();
			try {
				const result = await codeReader.decodeFromImageElement(image);
				const metadata = result.resultMetadata;
				byteSegments = metadata.get(2)[0];
				const canvas = qrMake(byteSegments);
				//imageContainer.appendChild (canvas)
				//uploadedImage.src = canvas.toDataURL();
				getData();
				
			} catch (error) {
				message.textContent = 'Failed to decode QR Code: ' + error;
				alert('Failed to decode QR Code: ' + error);
			}
		} else {
			message.textContent = 'No image to decode. Please upload a QR Code image first.';
			alert('Please upload a QR Code image first.');
		}
	}
	
	// --- Event Listener ---
	imageInput.addEventListener('change', (event) => {
		
		clearData();
		const file = event.target.files[0];
		event.target.value = '';
	
		if (file) {
			message.textContent = 'Loading image...';
			const reader = new FileReader();
			reader.onload = (e) => {
				uploadedImage.src = e.target.result;
				uploadedImage.onload = () => {
					showImage(uploadedImage);
					deqrcode(uploadedImage);
				}
			}
			reader.readAsDataURL(file);
		} else {
			message.textContent = 'Select image to begin';
		}
	})
	
	// --- Edit Title ---
	editTitleButton.addEventListener('click', () => {
		editTitleInput.value = displayTitle.textContent;
		show(editTitle);
		hide(infoView);
	})

	saveTitleButton.addEventListener('click', () => {
		if (editTitleInput.value === '') {
			alert("judul tidak boleh kosong")
		} else {
			mekoTitle = textToBytes(editTitleInput.value);
			displayTitle.textContent = editTitleInput.value;
			hide(editTitle);
			show(infoView);
			message.textContent = 'Title updated.';
		}
	})

	cancelTitleButton.addEventListener('click', () => {
		hide(editTitle);
		show(infoView);
	})
	
	generateButton.addEventListener('click', () => {
		if (!mekoBlocks) {
			alert('Mekorama data not found. Please upload a level QR Code first.');
			return;
		}
		
		const newTitle = textToBytes(displayTitle.textContent);
		const newAuthor = textToBytes(displayAuthor.textContent);
		const newBlocks = mekoBlocks.flat();
		
		const newLevel = new Uint8Array([
			newTitle.length, ...newTitle,
			newAuthor.length, ...newAuthor,
			...newBlocks
		])
		
		let deflatedLevel;
		try {
			deflatedLevel = pako.deflate(newLevel, { level: 1 });
		} catch (pakoError) {
			alert('Failed to compress level data with Pako.');
			console.error('Pako Compression Error:', pakoError);
			message.textContent = 'Failed to decompress level data. Error: ' + pakoError.message;
			return;
		}
		
		
		const header = byteSegments.slice(0, 4);
		
		const mekoData = [...header, ...deflatedLevel];
		
		try {
			const canvas = qrMake(mekoData);
			const qrLink = document.createElement('a');
			qrLink.href = canvas.toDataURL();
			qrLink.download = displayTitle.textContent + ".png";
			qrLink.click();
			
			message.textContent = 'QR Code successfully generated.';
			
		} catch (qrError) {
			alert('Failed to generate QR Code: ' + qrError.message);
			console.error('QR Generation Error:', qrError);
			message.textContent = 'Failed to generate QR Code.';
			}
	})

	function qrMake(data) {
		let qrDataString = '';
		data.forEach(char => qrDataString += String.fromCharCode(char));
		
		const typeNumber = 0;
		const errorCorrectionLevel = "L";
		const qr = qrcode(typeNumber, errorCorrectionLevel);
		qr.addData(qrDataString);
		qr.make();
		
		const moduleCount = qr.getModuleCount();
		const cellSize = 5;
		const margin = 4 * cellSize;
		const canvasSize = (moduleCount * cellSize) + (2 * margin);
		
		const canvas = document.createElement('canvas');
		canvas.width = canvasSize;
		canvas.height = canvasSize;
		
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, canvasSize, canvasSize);
		ctx.translate(margin, margin);
			
		qr.renderTo2dContext(ctx, cellSize);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		
		return canvas;
	}
	
	


});

