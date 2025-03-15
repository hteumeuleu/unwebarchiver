document.addEventListener('DOMContentLoaded', e => {
	const fileSelector = document.getElementById('file-selector');
	fileSelector.addEventListener('change', (event) => {
		const fileList = event.target.files;

		for (const file of fileList) {
			// Not supported in Safari for iOS.
			const name = file.name ? file.name : 'NOT SUPPORTED';
			// Not supported in Firefox for Android or Opera for Android.
			const type = file.type ? file.type : 'NOT SUPPORTED';
			// Unknown cross-browser support.
			const size = file.size ? file.size : 'NOT SUPPORTED';

			if (file.type && !file.type.startsWith('application/x-webarchive')) {
				console.log('File is not a webarchive.', file.type, file);
				return;
			}

			const reader = new FileReader();
			reader.addEventListener('load', (event) => {
				const buffer = event.target.result;

				// Header
				const headerBuffer = buffer.slice(0, 8);
				const headerArray = new Uint8Array(headerBuffer);
				const headerString = String.fromCharCode.apply(null, headerArray);
				console.debug(headerString, buffer.byteLength);

				// Trailer
				const trailerBuffer = buffer.slice(buffer.byteLength - 32, buffer.byteLength);
				const trailerArray = new Uint8Array(trailerBuffer);
				let trailer = {};
				trailer.sort_version = trailerArray[5];
				trailer.offset_table_offset_size = trailerArray[6];
				trailer.object_ref_size = trailerArray[7];
				trailer.num_objects = parseInt(new DataView(trailerBuffer.slice(8, 16)).getBigUint64());
				trailer.top_object_offset = parseInt(new DataView(trailerBuffer.slice(16, 24)).getBigUint64());
				trailer.offset_table_start = parseInt(new DataView(trailerBuffer.slice(24, 32)).getBigUint64());
				console.debug('trailer', trailer);

				// Offset table
				const offsetTableBuffer = buffer.slice(trailer.offset_table_start, buffer.byteLength - 32);
				// TODO: use a Uint8Array/Uint16Array/… here directly instead of generic Array and slicing loop.
				let offsetTable = new Array();
				for(i=0; i < (trailer.num_objects * trailer.offset_table_offset_size); i+=trailer.offset_table_offset_size) {
					const offset = new DataView(offsetTableBuffer.slice(i, i + trailer.offset_table_offset_size));
					switch(trailer.object_ref_size) {
						case 2:
							offsetTable.push(offset.getUint16());
						case 4:
							offsetTable.push(offset.getUint32());
						case 8:
							offsetTable.push(offset.getBigUint64());
						default:
							offsetTable.push(offset.getUint8());
					}
					
				}
				console.debug('offset table', offsetTable);

				// Object table
				for(i=0; i < offsetTable.length; i++) {
					const offset = offsetTable[i];
					const marker = new DataView(buffer.slice(offset, offset + 1)).getUint8();
					readObject(marker, offset);
				}

				function readObject(marker, offset) {
					switch(marker) {
						case 0x08:
							return false;
						case 0x09:
							return true;
						case 0x23:
							return '👀 0x23 — A real number of length 8 bytes';
						case 0x33:
							return readDate(offset);
						case 0x62:
							return '👀 0x62 — Unicode String';
						case 0xA2:
							return '👀 0xA2 — Array';
						case 0xD2:
							return readDictionary(offset, 2);
						case 0xD3:
							return readDictionary(offset, 3);
						case 0x56:
							return readASCII(offset+1, 6);
						case 0x57:
							return readASCII(offset+1, 7);
						case 0x5A:
							return readASCII(offset+1, 10);
						case 0x5B:
							return readASCII(offset+1, 11);
						case 0x5D:
							return readASCII(offset+1, 13);
						default:
							return '👀 TODO ' + marker;
					}
				}

				function readASCII(offset, length) {
					const charsBuffer = buffer.slice(offset, offset + length);
					const charsArray = new Uint8Array(charsBuffer);
					const charsString = String.fromCharCode.apply(null, charsArray);
					return charsString;
				}

				function readDictionary(offset, pairs) {
					const keysBuffer = buffer.slice(offset+1, offset+1 + pairs);
					const keysArray = new Uint8Array(keysBuffer);
					keysArray.forEach((item, i) => {
						const offset = offsetTable[keysArray[i]];
						const marker = new DataView(buffer.slice(offset, offset + 1)).getUint8();
						console.debug('—', readObject(marker, offset));
					});
					const valuesBuffer = buffer.slice(offset+1+pairs, offset+1 + (pairs*2));
					const valuesArray = new Uint8Array(valuesBuffer);
					valuesArray.forEach((item, i) => {
						const offset = offsetTable[valuesArray[i]];
						const marker = new DataView(buffer.slice(offset, offset + 1)).getUint8();
						console.debug('—', readObject(marker, offset));
					});
					return `👀 0xD${pairs} — A dictionary with ${pairs} key-value pairs`;
				}

				function readDate(offset) {
					const dateBuffer = buffer.slice(offset+1, offset + 1 + 8);
					const date = new DataView(dateBuffer).getFloat64();
					console.log(date);
					return `👀 0x33 — A date at ${offset}`;
				}


			});
			reader.readAsArrayBuffer(file);

		}

	});

});
