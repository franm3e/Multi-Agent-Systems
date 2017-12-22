/*
Cliente JavaScript
Rev: 0.5
Fecha: 11/12/2017
Autores: Alejandro Moya Moya
		 Jorge Valero Molina
		 Francisco Martinez Esteso
		 Miguel Ángel Cantero Víllora
UCLM - Escuela Superior de Ingeniería Informática Albacete
Sistemas Multiagentes 17/18
*/

var productos;
var tiendasConocidas;
var idCliente;
// Contador para insertar mensajes en el log
var num = 0;
var tiempoEjecucion;

// Producto: {Nombre: , Cantidad: }
// tiendasConocidas: {Id: , Direccion: , Tipo: , Visitado: (0 no visitada, 1 visitada)}
function main() {
	tiempoEjecucion = Date.now();
	idCliente = 0;
	var urlMonitor = '172.19.149.110:8080/monitor/Mensajes/recibir.php'; // OJO: ponerlo en el html
	//var urlMonitor = $("#MonitorInput").val();
	consola("El monitor se encuentra en la direccion " + urlMonitor);
	productos = [];
    tiendasConocidas = [];

	var ipCliente
	// Funcion jQuery que obtiene la ip de la maquina
	$.ajax({
		url: 'https://ipinfo.io/',
		async: false,
		dataType: 'json',
		contentType: 'application/j-son;charset=UTF-8',
		success: function (data) {
			ipCliente = data.ip
		}
	});

	
	consola("Cliente iniciado... Enviando mensaje al monitor para arrancar (Mensaje CM1)", "green");
	// Mensaje de inicio, Cliente --> Monitor
	var estado = sender(urlMonitor, Create_CM1(idCliente, urlMonitor, ipCliente), urlMonitor);
	
	// Si el mensaje no ha sido mandado paramos la ejecución del programa
	if (estado != 200){
		consola("Error al enviar mensaje al monitor, terminando ejecucion del cliente... :(","red");
		return 1;
	}
	
	consola("Has recibido lo siguiente del monitor: ");
	consola("IDCliente: " + idCliente);
	consola("Listado de la compra:");
	mostrarProductos(productos);
	consola("Listado de tiendas conocidas:");
	mostrarTiendas(tiendasConocidas);
	
	// Comprobamos si hemos recibido productos para comprar, lista de tiendas para visitar o un ID adecuado
	if (productos.length == 0 || tiendasConocidas.length == 0 || idCliente == 0){
		consola("ERROR: el monitor no te ha dado bien la lista de productos o las tiendas que conoces.", "red");
		return 1;
	}
	
	// DEBUG: Si falta el monitor descomentar lo siguiente 
	/*
	idCliente = 123
	productos.push({Nombre: "P1", Cantidad:10})
	productos.push({Nombre: "P2", Cantidad:20})
	tiendasConocidas.push({Id:"T1", Direccion:urlMonitor , Tipo:"php" , Visitado: 0})
	tiendasConocidas.push({Id:"T2", Direccion:"172.19.158.78:5000/sendXML" , Tipo:"py" , Visitado: 1})
	consola(productos);
	consola(tiendasConocidas);
	*/
	
	var i;
	var estoyEnTienda;
	// El agente se conectará a las diferentes tiendas hasta que obtenga todos los productos deseados
	while(productos.length!= 0){
		// Indicamos que no estamos en una tienda
		estoyEnTienda = -1;
		consola("Tienes que comprar los siguiente productos");
		mostrarProductos(productos);
		// Mientras que no hayamos entrado en una tienda... intentamos entrar en alguna
		while(estoyEnTienda == -1){
			// Recorremos el vector de las tiendas conocidas
			for (i = 0; i< tiendasConocidas.length; i++){
				// Si la tienda no ha sido visitada
				if (tiendasConocidas[i].Visitado == 0){
					// Intentamos entrar a la tienda mandando un mensaje CT1
					estado = sender(tiendasConocidas[i].Direccion, Create_CT1(idCliente, tiendasConocidas[i].Id, ipCliente), urlMonitor);
					// Si obtenemos un estado = 101, significa que podemos entrar a la tienda y compramos los productos que necesitamos
					if (estado==101){
						consola("Has entrado en la tienda " + tiendasConocidas[i].Direccion);
						// La marcamos como visitada
						tiendasConocidas[i].Visitado = 1;
						// Nos guardamos la posicion donde se encuentra almacenada la tienda en el vector de tiendas conocidas del agente
						estoyEnTienda=i;
						// Salimos del for
						break;
					// Si obtenemos un estado = 100, la tienda no nos deja entrar, deberemos de probar mas adelante
					} else if (estado == 100){
						consola("La tienda " + tiendasConocidas[i].Direccion + " esta ocupada, intentalo mas tarde");
					// Si el estado es 400, el XML que hemos enviado es erroneo.
					} else if (estado == 400){
						consola("ERROR 400, XML mal formado", "red");
					// Si el estado es 404, la tienda a la que queremos acceder no existe, por lo tanto lo eliminamos de nuestras tiendas conocidas
					} else if (estado == 404){
						consola("ERROR 404, tienda no encontrada, eliminando tienda...", "red");
						tiendasConocidas.splice(i,1);
						i--;
					// Si el error es 500, la tienda tiene algun fallo y por lo tanto no puede procesar nuestro mensaje, lo eliminamos del sistema
					} else if (estado == 500 || estado == -1){
						consola("ERROR 500 o mensaje recibio erroneo, fallo interno en el tienda, eliminando tienda...", "red");
						tiendasConocidas.splice(i,1);
						i--;
					}
				}
			}		
		}
		
		consola("Tienes que comprar los siguientes productos: ")
		mostrarProductos(productos);
		// Si quedan productos por comprar, preguntamos por nuevas tiendas
		if (productos.length != 0){
			// Inicializamos un contador de veces que preguntamos a una tienda
			var j = 0;
			do{
				consola("Preguntando nuevas tiendas...");
				// El agente envia un mensaje (CT4) y pregunta por nuevas tiendas para visitar
				estado = sender(tiendasConocidas[estoyEnTienda].Direccion, Create_CT4(idCliente, tiendasConocidas[estoyEnTienda].Id, ipCliente), urlMonitor);
				// El XML que se ha mandado es erroneo
				if (estado == 400){
					consola("ERROR 400, XML mal formado", "red");
				// Si el estado es 404, la tienda a la que queremos acceder no existe, por lo tanto lo eliminamos de nuestras tiendas conocidas
				} else if (estado == 404){
					consola("ERROR 404, tienda no encontrada, eliminando tienda...", "red");
					tiendasConocidas.splice(i,1);
					estoyEnTienda = -1;
				// Fallo interno en la tienda, no puede procesar nuestro mensaje, por lo tanto lo eliminamos
				} else if (estado == 500 || estado == -1){
					consola("ERROR 500 o mensaje recibio erroneo, fallo interno en el tienda, eliminando tienda...", "red");
					tiendasConocidas.splice(i,1);
					estoyEnTienda = -1;
				}
				// Una vez llegado a las 20 preguntas, desistimos y continuamos con la ejecución 
				if (j == 20){
					consola("ERROR: el sistema no ha sido capaz de proporcionar nuevas tiendas...", "red");
					break;
				}
				j++;
			}while (quedanSinVisitar() == false && estoyEnTienda != -1)
		}
		
		// Si la ejecucion no ha fallado y seguimos en una tienda, le indicamos que vamos a salir
		if (estoyEnTienda != -1){
			consola("Saliendo de la tienda: " + tiendasConocidas[estoyEnTienda].Id)
			estado = sender(tiendasConocidas[estoyEnTienda].Direccion, Create_CT6(idCliente, tiendasConocidas[estoyEnTienda].Id, ipCliente), urlMonitor);
			// Error en el XML que hemos enviado
			if (estado == 400){
				consola("ERROR 400, XML mal formado", "red");
			// Si el estado es 404, la tienda a la que queremos acceder no existe, por lo tanto lo eliminamos de nuestras tiendas conocidas
			} else if (estado == 404){
				consola("ERROR 404, tienda no encontrada, eliminando tienda...", "red");
				tiendasConocidas.splice(i,1);
			// Fallo interno en la tienda, no puede procesar nuestro mensaje, por lo tanto lo eliminamos
			} else if (estado == 500 || estado == -1){
				consola("ERROR 500 o mensaje recibio erroneo, fallo interno en el tienda, eliminando tienda...", "red");
				tiendasConocidas.splice(i,1);
			}
		}
	}
	
	
	consola("Enviando mensaje al monitor para finalizar el cliente (Mensaje CM3)");
	// El agente comunica al monitor que ha finalizado su ejecucion
	var estado = sender(urlMonitor, Create_CM3(idCliente, urlMonitor, ipCliente), urlMonitor);
	consola("Has terminado con la siguiente informacion: ");
	consola("IDCliente: " + idCliente);
	consola("Listado de la compra:");
	mostrarProductos(productos);
	consola("Listado de tiendas conocidas:");
	mostrarTiendas(tiendasConocidas);
	consola("El cliente ha terminado la ejecucion satisfactoriamente: gracias por jugar","green");
	tiempoEjecucion=Date.now() - tiempoEjecucion;
	tiempoEjecucion/=1000;
	consola("El cliente ha tardado en comprar: " + tiempoEjecucion, "green");
	return 0;
}

// Funcion que nos devuelve si queda alguna tienda por visitar. True == queda alguna, False == todas han sido visitadas
function quedanSinVisitar(){
	// Recorrer todo el vector hasta que encontremos una tienda que no ha sido visitada
	for(var i=0; i < tiendasConocidas.length; i++){
		// Si la encontramos devolvemos que si
		if (tiendasConocidas[i].Visitado == 0){
				return true;
			}
	}
	// Si no la encontramos devolvemos que no
	return false;
}


function mostrarProductos(array){
	if (array.length == 0){
		consola("No hay nada que comprar","green");
	}
	for (var i=0; i<array.length; i++){
		consola("        Nombre: " + array[i].Nombre +"       " + "Cantidad: " + array[i].Cantidad,"blue");
	}
	consola("Productos:");
}

function mostrarTiendas(array){
	
	for (var i=0; i<array.length; i++){
		consola("    ID: " + array[i].Id +"   " + "Direccion: " + array[i].Direccion + "    Tipo: " + array[i].Tipo + "   V: " + array[i].Visitado, "blue");
	}
	consola("Tiendas:");
}


// Función que nos permite mandar un XML dada la URL de envio (direccion) y el mensaje (mensaje)
function sender(direccion, mensaje, dirMonitor) {
	// Mensaje no enviado a la direccion deseada
	var estado=-1;
	$.ajax({
		url: 'http://' + direccion.replace("http://", "").replace(/\/\//g,"/"),
		data: mensaje,
		type: "POST",
		async: false,
		dataType: 'text',
		contentType: 'text/xml',
		
		// Funcion que se ejecuta antes de enviar el mensaje
		beforeSend: function(request) {
			consola("Mandando mensaje a: " + direccion);
			consola("Mensaje enviado: " + mensaje);
		},

		// Funcion que se ejecuta si se ha enviado correctamente y se ha recibido respuesta del agente
		success: function(response) {
			consola("Mensaje recibido de " + direccion + ": " + response, "green");
			estado=200; //Acierto, todo va bien
			// Dado que el mensaje se ha enviado correctamente, se procede a procesar la respuesta obtenida
			var parser = new DOMParser();
			// Se transforma el mensaje al formato XML
			var response_xml = parser.parseFromString(response,"text/xml");
			// Se mira la raiz del mensaje, con el fin de saber de que se trata el mensaje recibido
			var raiz = response_xml.documentElement.tagName
			// Mensaje de respuesta a CM1 (Se obtiene la ID, la lista de tiendas y la lista de productos)
			if (raiz == "MC2"){
				parser_MC2(response_xml);
			}
			// Mensaje de respuesta a CM3 (No hay que hacer nada)
			else if (raiz == "MC4"){
				parser_MC4(response_xml);
			}
			// Mensaje de respuesta a CT1 (Se nos indica que la tienda esta ocupada, no se trata nada y se retorna el codigo de error 100)
			else if (raiz == "TC2"){
				parser_TC2(response_xml);
				estado = 100; // Codigo de acierto 100: tienda ocupada 
			}
			// Mensaje de respuesta a CT1 (Se nos indica que la tienda esta libre, se nos da los productos que hemos comprado y se retorna el codigo 101)
			else if (raiz == "TC3"){
				parser_TC3(response_xml);
				estado = 101; // Codigo de acierto 101: tienda no ocupada, has comprado 
			}
			// Mensaje de respuesta a CT4 (Se nos indica las nuevas tiendas que podemos visitar)
			else if (raiz == "TC5"){
				parser_TC5(response_xml);
			}
			// Mensaje de respuesta a CT6 (No hay que hacer nada)
			else if (raiz == "TC7"){
				parser_TC7(response_xml);
			}
			// Si es cualquier otra cosa, no sabemos procesarlo y lo indicamos, devolvemos un codigo de error -1
			else {
				consola("ERROR: mensaje desconocido" + "Raiz Obtenida: " + raiz, "red");
				consola("Mensaje: " + response);
				consola("Mensaje parseado: " + response_xml);
				estado = -1;
			}
			
			// Si la direccion de envio es distinta a la direccion del monitor, replicamos el mensaje
			if (direccion !== dirMonitor){
				var estadoMonitor = -1;
				//Mientras que de error al replicar el mensaje al monitor, seguimos intentandolo.
				while (estadoMonitor == -1){
					//devolvera cero si se replica correctamente
					estadoMonitor = replicador(dirMonitor,mensaje);
				}

			}
			
		},

		// Funcion que se ejecuta, si se ha recibido un mensaje de error del sistema de envio
		error: function(response) {
			consola("Error " + response.status + ": " + response.statusText, "red");
			consola(response.responseText);
			// Nos guardamos el codigo de error
			estado=response.status;
		}
	});
	return estado;
}

// Funcion encargada de enviar un mensaje al monitor, unicamente aquellos mensajes cuya respuesta no debamos analizar (la replica de un mensaje)
function replicador(urlMonitor, mensaje){
	var estado = -1;
	$.ajax({
		url: 'http://' + urlMonitor.replace("http://", "").replace(/\/\//g,"/"),                   
		data: mensaje,
		type: "POST",
		async: false,
		dataType: 'text',
		contentType: 'text/xml',

		beforeSend: function(request) {
			//No mostramos mas mensajes por no sobrecargar la consola
			//consola("Mandando mensaje replica a Monitor: " + urlMonitor);
			//consola("Mensaje replicado enviado: " + mensaje);
		},
		//Cuando el mensaje se envia correctamente y recibimos la respuesta, se ejecuta esta funcion.
		success: function(response) {
			consola("Exito mensaje Monitor: " + response, "green");
			//cambiamos el estado para salir del while del sender
			estado = 0;
		},
		// Funcion que se ejecuta, si se ha recibido un mensaje de error del sistema de envio
		error: function(response) {
			consola("Fallo envio monitor!", "red");
			//mostramos el error
			consola("Error " + response.status + ": " + response.statusText, "red");
			consola(response.responseText);
			//cambiamos el estado a error para seguir en el while del sender
			estado=-1; 
		}
	});
	return estado;
	
}


// **************** Funciones de creacion de mensajes XML **************** //
// Mensajes Cliente -> Monitor
// Mensaje de inicio
function Create_CM1(idCliente, urlMonitor, ipCliente){
	xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<CM1>\
<emisor>' + idCliente + '</emisor>\
<receptor>' + urlMonitor + '</receptor>\
<time>\
<timestamp>' + Date.now() + '</timestamp>\
<creador>' + ipCliente + '</creador>\
</time>\
</CM1>';
	return xml.replace('\t','').replace('\n','');
}

// Mensaje Cliente -> Monitor
// Mensaje de fin
function Create_CM3(idCliente, urlMonitor, ipCliente){
	xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<CM3>\
<emisor>' + idCliente + '</emisor> <!-- Codigo 0 no hay emisor -->\
<receptor>' + urlMonitor + '</receptor> <!-- IP del monitor -->\
<time>\
<timestamp>' + Date.now() + '</timestamp>\
<creador>' + ipCliente + '</creador> <!-- IP del cliente -->\
</time>\
</CM3>';
	return xml.replace('\t','').replace('\n','');
}


// Mensajes Cliente -> Tienda
// Mensaje de inicio
function Create_CT1(idCliente, idTienda, ipCliente){
	xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<CT1>\
<emisor>' + idCliente + '</emisor>\
<receptor>' + idTienda + '</receptor>\
<time>\
<timestamp>' + Date.now() + '</timestamp>\
<creador>' + ipCliente + '</creador>\
</time>\
<listaP>';
	var i;
	for (i=0; i< productos.length; i++){
		xml = xml + '<producto>\
<nombre>' + productos[i].Nombre + '</nombre>\
<cantidad>' + productos[i].Cantidad + '</cantidad>\
</producto>';
	}
	
	xml = xml + '</listaP>\
<listaT>';
	var i;
	for (i=0; i< tiendasConocidas.length; i++){
		xml = xml + '<tienda>\
<idTienda>' + tiendasConocidas[i].Id + '</idTienda>\
<direccion>' + tiendasConocidas[i].Direccion + '</direccion>\
<tipo>' + tiendasConocidas[i].Tipo + '</tipo>\
</tienda>';
	}
	
	xml = xml + '</listaT>\
</CT1>';

	return xml.replace('\t','').replace('\n','');
}

// **************** Funciones de tratado de respuestas de los mensajes XML recibidos **************** //
// Mensaje Cliente -> Tienda
// Mensaje en el que se pide nuevas tiendas a visitar
function Create_CT4(idCliente, idTienda, ipCliente){
	xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<CT4>\
<emisor>' + idCliente + '</emisor>\
<receptor>' + idTienda + '</receptor>\
<time>\
<timestamp>' + Date.now() + '</timestamp>\
<creador>' + ipCliente + '</creador>\
</time>\
</CT4>';

	return xml.replace('\t','').replace('\n','');
}

// Mensaje Cliente -> Tienda
// Mensaje en el que el cliente se despide de la tienda
function Create_CT6(idCliente, idTienda, ipCliente){
	xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
<CT6>\
<emisor>' + idCliente + '</emisor>\
<receptor>' + idTienda + '</receptor>\
<time>\
<timestamp>' + Date.now() + '</timestamp>\
<creador>' + ipCliente + '</creador>\
</time>\
</CT6>';

	return xml.replace('\t','').replace('\n','');
}



// Este mensaje se recibirá cuando enviemos el mensaje CM1 (mensaje de inicialización)
// Este mensaje es una respuesta del monitor y con este mensaje se obtendrán las tiendas que conocemos y los productos que tenemos que comprar.
function parser_MC2(xml){
	// Obtenemos la ID asignada por el Monitor
	idCliente = xml.getElementsByTagName("receptor")[0].childNodes[0].nodeValue;
	// Obtenemos las tiendas que el monitor nos pasa, para ello localizamos la etiqueta "tienda"
	tiendas = xml.getElementsByTagName("tienda");
	var tienda;
	// Recorremos las veces que aparezca la etiqueta "tienda" en el XML, para así ir añadiendolo al Array de tiendasConocidas.
	for (var i=0; i < tiendas.length; i++){
		tienda = {Id: tiendas[i].getElementsByTagName("idTienda")[0].childNodes[0].nodeValue, Direccion: tiendas[i].getElementsByTagName("direccion")[0].childNodes[0].nodeValue, Tipo: tiendas[i].getElementsByTagName("tipo")[0].childNodes[0].nodeValue, Visitado: 0};
		tiendasConocidas.push(tienda);
	}
	
	// Obtenemos los productos a comprar que el monitor nos indica, para ello localizamos la etiqueta "producto"
	compras = xml.getElementsByTagName("producto");
	var compra;
	// Recorremos las veces que aparezca la etiqueta "producto" en el XML, para así ir añadiendolo al Array de productos.
	for (var i=0; i < compras.length; i++){
		compra = {Nombre: compras[i].getElementsByTagName("nombre")[0].childNodes[0].nodeValue, Cantidad: compras[i].getElementsByTagName("cantidad")[0].childNodes[0].nodeValue};
		productos.push(compra);
	}
	
	// Codigo de acierto 0: todo se ha parseado correctamente.
	return 0;
}
// Este mensaje se recibirá cuando enviemos el mensaje CM3 (mensaje de finalización)
// Este mensaje es una respuesta del monitor.
function parser_MC4(xml){
	
	// Codigo de acierto 0: todo se ha parseado correctamente.
	return 0;
}
// Este mensaje se recibirá cuando enviemos el mensaje CT1 (mensaje de quiero entrar y estos son los productos que quiero)
// Este mensaje es una respuesta de la tienda para decirnos que no puede atendernos, esta llena.
function parser_TC2(xml){

	// Codigo de acierto 0: todo se ha parseado correctamente.
	return 0;
}

// Este mensaje se recibirá cuando enviemos el mensaje CT1 (mensaje de quiero entrar y estos son los productos que quiero)
// Este mensaje es una respuesta de la tienda para decirnos que hemos comprado X productos.
function parser_TC3(xml){
	
	// Obtenemos las productos que hemos comprado, para ello localizamos la etiqueta "producto"
	var productosComprados = xml.getElementsByTagName("producto");
	var producto;
	// Recorremos las veces que aparezca la etiqueta "producto" en el XML, para así ir descontando los productos que necesitamos.
	for (var i=0; i < productosComprados.length; i++){
		producto = {Nombre: productosComprados[i].getElementsByTagName("nombre")[0].childNodes[0].nodeValue, Cantidad: parseInt(productosComprados[i].getElementsByTagName("cantidad")[0].childNodes[0].nodeValue)};
		//Obtenemos la posicion donde se encontraria el producto que hemos comprado en nuestra lista de compra
		//var posicion = productos.indexOf(producto); NO FUNCIONA
		var posicion = -1;
		for(var j=0; j < productos.length; j++){
			if (productos[j].Nombre == producto.Nombre){
				posicion = j;
				break;
			}
		}
		//Procedemos a restar la cantidad comprada a la que necesitabamos.
		productos[posicion].Cantidad=productos[posicion].Cantidad-producto.Cantidad;
		// Si ya hemos comprado todo lo que necesitabamos, lo borramos de nuestro array
		if (productos[posicion].Cantidad == 0) {
			//Borramos esa posicion y recolocamos el vector
			productos.splice(posicion,1);
		}
	}
	
	// Codigo de acierto 0: todo se ha parseado correctamente.
	return 0;
	
}

// Este mensaje se recibirá cuando enviemos el mensaje CT4 (Dame Tiendas conocidas)
// Este mensaje es una respuesta de la tienda.
function parser_TC5(xml){

	// De la lista de tiendas 'tiendaT' obtengo todos los elementos con etiqueta 'tienda'
	var nodoListaT = xml.getElementsByTagName("listaT")[0].getElementsByTagName("tienda");
	// Por cada nodo 'tienda' de la lista, obtengo el identificador, la direccion y el tipo, y lo añado al vector de tiendasConocidas
	for (var i = 0; i < nodoListaT.length; i++)
	{
		var id = nodoListaT[i].getElementsByTagName("idTienda")[0].innerHTML;
		var direccion = nodoListaT[i].getElementsByTagName("direccion")[0].innerHTML;
		var tipo = nodoListaT[i].getElementsByTagName("tipo")[0].innerHTML;
		var tienda = {Id: id, Direccion: direccion, Tipo: tipo, Visitado: 0};
		if (tienda in tiendasConocidas){
			consola("Tienda repetida!!","red");
		}else{
			tiendasConocidas.push(tienda);
		}
		
	}

	// Codigo de acierto 0: todo se ha parseado correctamente.
	return 0;
}

// Este mensaje se recibe al enviar CT6 (Adiós)
// Confirmación de FIN (compra realizada y terminada)
function parser_TC7(xml){
	// Codigo de acierto 0: todo se ha parseado correctamente.
	return 0;
}


// Función encargada de añadir rows(filas o entradas) en la tabla 'log' de la interfaz.

function AddRow(text, danger="black"){
	var tableRef = document.getElementById('tablalog').getElementsByTagName('tbody')[0];
	
	// Insert a row in the table at the last row
	var newRow   = tableRef.insertRow(0);
	
	if (danger == "red") {
		newRow.className = "bg-danger";
	}
	if (danger == "green") {
		newRow.className = "bg-success";
	}
	if (danger == "blue") {
		newRow.className = "bg-primary";
	}
	
	// Insert a cell in the row at index 0
	var newCellnumber  = newRow.insertCell(0);
	var newCell  = newRow.insertCell(1);

	// Append a text node to the cell
	var newNumber = document.createTextNode(num++);
	var newText  = document.createTextNode(text);
	newCellnumber.appendChild(newNumber);
	newCell.appendChild(newText);
}

// Funcion encargada de hacer un cosole.log y a su vez, hace un "AddRow" para imprimir el mensaje tambien en la interfaz
function consola(msg, danger="black"){
	console.log(msg);
	AddRow(msg, danger);	
}

// Funcion que reinicia el programa
function stop(){
	location.reload();	
}