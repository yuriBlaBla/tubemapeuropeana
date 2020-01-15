import axios from 'axios';
import $ from 'jquery';

//linqjs permette di fare delle query in "stile SQL" ai dizionari
require('linqjs');
// mi permette di interrogare per valore i dizionari
const _ = require('underscore-node');
// libreria per le infografiche
export const d3 = require('d3');
const tubeMap = require('d3-tube-map');
d3.tubeMap = tubeMap.tubeMap;

var statenodes=[];

//inizializza la mappa
export const initTubeMap = (data) => {
	let container = d3.select('#tubeMap');
	let width = document.getElementById('tubeMap').offsetWidth;
	let height = document.getElementById('tubeMap').offsetHeight;
	
	let map = d3.tubeMap()
	.width(width)
	.height(height)
	.margin({
	  top: 20,
	  right: 20,
	  bottom: 40,
	  left: 100,
	})
	.on("click", function (name) {
		modal(name)
	});
	
	container.datum(data).call(map);
	
	let svg = container.select('svg');
	
	let zoom = d3
	  .zoom()
	  .scaleExtent([0.5, 6])
	  .on('zoom', zoomed);
	
	let zoomContainer = svg.call(zoom);
	//initialScale dice quanto dev'essere zoomato il valore della variabile
	let initialScale = 0.8;
	let initialTranslate = [-350, -200];
	
	zoom.scaleTo(zoomContainer, initialScale);
	zoom.translateTo(zoomContainer, initialTranslate[0], initialTranslate[1]);
	
	function zoomed() {
	  svg.select('g').attr('transform', d3.event.transform.toString());
	}
}

function modal(name){
	statenodes.select(
		function(t){ 
			if(t.name===name){
				$('#imageheader').html(
					'<img src="'+t.img_preview+'" alt="'+adjuststring(t.name)+'" />'
				);
				$('#imageheader').click(function(){ window.open(t.img_preview) });
				$('#titlemodal').html(adjuststring(t.name));
				$('#modalparagraph').html(t.description);
				$('#modal').show();
			}
		}
	);
}

var template_station={
	"name": "",
	"label": "",
	"place_id": "",
	"address": "",
	"website": "",
	"phone": "",
	"position": {
		"lat": null,
		"lon": null
	}
};

var template_line={
	"name": "",
	"label": "",
	"color": "",
	"shiftCoords": [null, null],
	"nodes": []
};


function hexcolor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

//rimuove i duplicati di un array in base a un campo
function getUnique(arr, comp) {

  const unique = arr
       .map(e => e[comp])

     // store the keys of the unique objects
    .map((e, i, final) => final.indexOf(e) === i && i)

    // eliminate the dead keys & store unique objects
    .filter(e => arr[e]).map(e => arr[e]);

   return unique;
}


/*
Le due funzioni: savelines e generateMetroLine
le devo rifare in nodejs sotto form di API POST
*/
// prende i dati dalla risorsa e li converte in un formato intermedio leggibile

function returnstep(data,mapdict){
	var step={
		'author': '',
		'year': '',
		'title':'',
		'country': '',
		'placeposition': '',
		'img_preview': '',
		'genre':'',
		'description': ''
	}

	for (let [k, v] of Object.entries(mapdict)) {
		step[k]=returnMappedValue(data, v)
	}

	return step
}

function returnMappedValue(data, map){
	let response=null;
	map=map.split('.');
	if(map.length===1){
		response=data[map]
	}else{
		let newval=null;
		for(let i=0; i<map.length;i++){
			if(newval===null){
				newval=data[map[0]]
			}else{
				newval=newval[map[i]]
			}
		}
		response=newval
	}
	return response
}

function getKeyByValue(object, value) { 
    return Object.keys(object).find(key =>  
            object[key] === value); 
}


export function savelines(data, mapdict, linecriteria, stepcriteria){
	let metrolines=[];
	let lines=[];
	let intervalx=[];

	for (let i = 0; i < data.length; i++){
		try{
			let line=returnMappedValue(data[i], linecriteria);//data[i][linecriteria][0];
			let item= null;
			let step=returnstep(data[i],mapdict);

			step.author=line;
			let stepcriteriaValue=returnMappedValue(data[i], stepcriteria);
			let stepcriteriaKey=getKeyByValue(mapdict, stepcriteria);

			step.title+='@('+stepcriteriaValue+')';

			if(!intervalx.includes(stepcriteriaValue)){
				intervalx.push(stepcriteriaValue);
			}
			if(!lines.includes(line)){
				if(stepcriteriaValue){
					lines.push(line);
					let color=hexcolor();
					item={
						"title": line,
						"color": color,
						"steps": [step],
						'criteria':[stepcriteriaValue],
						'similarities':[]
					}
				}
			}else{
				metrolines.select(
					function(t){ 
						if(t.title===line){
							t.steps.push(step);
							t.steps.sort((a,b) => 
								(a[[stepcriteriaKey]] > b[[stepcriteriaKey]]) ? 1 : 
								((b[[stepcriteriaKey]] > a[[stepcriteriaKey]]) ? -1 : 0)
							);
							t.steps=getUnique(t.steps, 'title');
							if(!(t.criteria.includes(step.year))){
								t.criteria.push(step.year).sort();
							}
						}
					}
				);
			}
			if(item!==null&& item.title){
				metrolines.push(item);
			}
		}catch{}
	}

	intervalx=intervalx.sort();

	for(let i=0;i<metrolines.length;i++){
		if(metrolines[i].steps.length===1){
			metrolines[i].steps.push({
				'author': '',
				'year': 'marker'+metrolines[i].steps[0].year,
				'title':'',
				'country': '',
				'placeposition': '',
				'img_preview': '',
				'description': '',
				'fake':true
			})
		}
	}

	let dict={
		'metrolines':metrolines,
		'intervalx':intervalx
	}

	let coords=generateCoords(dict);
	dict['xcoords']=coords.xcoords;
	dict['ycoords']=coords.ycoords;
	dict['intersections']=coords.intersections;

	return dict
}

// questo metodo genera 3 liste:
// lista delle coordinate sull'asse x degli stop
// lista delle coordinate sull'asse y delle linee della metro
// lista delle intersezioni
function generateCoords(dict){
	// coords= linea: valori stop (es lineaA: 1800, 1820, 1825)
	let coords=[];
	// xcoords= <linea:coordinate X degli stop> (es <lineaA: [0, 2, 3]>)
	let xcoords=[];
	// ycoords= <linea:coordinate Y delle linee> (es <lineaA:0>)
	let ycoords=[];
	//  intersections= <coordinata X di uno stop: linee> (es <1820: [lineaA, lineaC]>)
	let intersections=[];

	for(let i=0; i<dict.metrolines.length;i++){
		let converted=[];
		let to_convert=dict.metrolines[i].criteria.sort();
		for(let j=0;j<to_convert.length;j++){
			converted.push(dict.intervalx.indexOf(to_convert[j]));
		}
		xcoords[dict.metrolines[i].title]=converted;
		ycoords[dict.metrolines[i].title]=i;
		coords[dict.metrolines[i].title]=dict.metrolines[i].criteria
	}
	for(let i=0; i<dict.intervalx.length;i++){
		intersections[dict.intervalx[i]]=[]
	}
	for (let [key, value] of Object.entries(coords)) {
		for(let i=0; i<value.length;i++){
			intersections[value[i]].push(key)
		}
	}
	let newcoords_y=[]

	for (let [key, value] of Object.entries(intersections)){
		if(value.length>1){
			let firstkey=value[0];
			let key_in_y=ycoords[firstkey];
			for(let i=0; i<value.length;i++){
				let val=key_in_y+i;
				newcoords_y[value[i]]=key_in_y+i;
			}
		}
	}

	for (let [key, value] of Object.entries(newcoords_y)){
		let oldkey=(_.invert(ycoords))[value];
		let oldvalue=ycoords[key];
		ycoords[oldkey]=oldvalue;
		ycoords[key]=value;
	}

	return {
			'xcoords': xcoords,
			'ycoords': ycoords,
			'intersections': intersections,
	}
}


// prende i dati nel formato intermedio e li converte nel formato accettato da initTubeMap
export function generateMetroLine(dict){
	let metrolines=dict.metrolines;
	let response;
	let stations=[];
	let lines=[];

	let coordLabel=['N','S'];
	let coordcontrol=true;

	let coordsintersections=[];

	for(let i=0; i<metrolines.length;i++){
		let line=JSON.parse(JSON.stringify(template_line));
		line.name=metrolines[i].title;
		line.label=metrolines[i].title;
		line.color=metrolines[i].color;
		//provvisoriamente
		line.shiftCoords=[0,0];

		let nodes=[];
		for(let j=0; j<metrolines[i].steps.length;j++){
			let node={
				'coords':null,
				'name':null,
				'labelPos':null,
				'img_preview':null,
				'description':null,
				'marker':null,
				'line':metrolines[i].title
			}
			let x=(dict.xcoords[line.name][j]);
			let intersection=dict.intervalx[x];
			intersection=dict.intersections[intersection];
			try{
				if(intersection.length>1){
					node.marker='interchange';
				}
			}catch{}

			x=x*15;
			let y=(dict.ycoords[line.name])*15;
			node.coords=[x,y];

			node.name=metrolines[i].steps[j]['title'].replace(/ /g,'');
			node.name=metrolines[i].steps[j]['title'].replace('"','');
			node.img_preview=metrolines[i].steps[j]['img_preview'];
			node.description=metrolines[i].steps[j]['description'];

			if(node.name==="Dwa szczeniaki pod kwiatem@(1832)"){
				node.name="Aktor Bando Minosuke ( Mitsugoro III) z tancerzem w masce symbolizującej dobro@(1832)"
			}


			if(coordcontrol===true){
				node.labelPos=coordLabel[0];
			}else{
				node.labelPos=coordLabel[1];
			}

			coordcontrol=!coordcontrol;
			nodes.push(node);

			let station=JSON.parse(JSON.stringify(template_station));

			station.name=metrolines[i].steps[j]['title'];
			station.name=station.name.replace('"','');
			let label=metrolines[i].steps[j]['title'].toLowerCase();
			label=adjuststring(label);
			if(station.name===""){
				label= ' '
			}
			station.label=label;
			stations[node.name]=station;

			statenodes.push(node);
			try{
				if(intersection.length>1){
					//coordsintersections[line.name].push(node);
					try{
						coordsintersections[node.name].push(node);
					}catch{
						coordsintersections[node.name]=[node];
					}
				}
			}catch{}
		}
		line.nodes=nodes;

		lines.push(line);
	}


	for (let [key, value] of Object.entries(coordsintersections)) {
		let maxy=0;
		let names=[];
		for(let i=0; i<value.length;i++){
			if(value[i].coords[1]>maxy){
				maxy=value[i].coords[1]
			}
			value[i].coords[1]=maxy;
			let linename=value[i].line;
			names.push(linename);
		}
		for(let i=0;i<names.length;i++){
			lines.select(function(l){
				if(l.name===names[i]){
					l.nodes.select(function(node){
						if(node.name===key){
							node.coords[1]=maxy;
						}
					});
				}
			});
		}
	}
	response={
		"stations":stations,
		"lines":lines
	}

	return response
}


function adjuststring(s){
	let arr_title=s.split('@');
	s=arr_title[0];
	let criteria = arr_title[1];
	if(s.includes(';')){
		let arr=s.split(';');
		s=arr[0];
	}
	if(s.includes('(')){
		let arr=s.split('(');
		s=arr[0];
	}
	let count=0;
	let arr=s.split(' ');
	let response='';

	for(let i=0; i<arr.length; i++){
		if(count===3){
			response+='\n'+arr[i];
			count=0
		}else{
			response+=' '+arr[i];
			count++
		}
	}
	response=response.trim();
	response+='\n'+criteria;
	return response
}


export function parsecollection(collectionname, linecriteria, stepcriteria){
	let prefixurl='https://www.europeana.eu/api/v2/search.json?wskey=';
	let apikey='K8XLRtwFQ'
	let operation='&query';
	let apiCall=prefixurl+apikey+operation+'='+collectionname+'&start=1&rows=100';
	let response=null;

	$.getJSON(apiCall, function (json) {
		let data=savelines(json, savelines, linecriteria, stepcriteria);
		let metrolines=generateMetroLine(data);
		try{
			initTubeMap(metrolines);
		}
		catch{
			window.location.reload(true); 
		}
	});
}
