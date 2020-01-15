import React, { Component } from 'react';
import $ from 'jquery';
import axios from 'axios';
import {
    parsecollection,
    savelines,
    generateMetroLine,
    initTubeMap,
    d3
    } from './src/js/tubemap.js';
import {
	getSVGString,
	svgString2Image
	} from './src/js/savesvg.js';
import { saveAs } from 'file-saver';
import './src/css/tubemap.css';


class Tubemap extends Component {
    constructor(props){
        super(props);
        this.state={
        	metrolines:[],
        }
    }
    componentDidMount() {
		let apiCall='https://www.europeana.eu/api/v2/search.json?wskey=K8XLRtwFQ&query='+
		'ukiyo-e&start=1&rows=100';
		//let apiCall='./pollicinadata.json';
		let response=null;

		let mapdict={
			'year':'year.0',
			'title': 'title.0',
			'country': 'country.0',
			'placeposition': 'dataProvider.0',
			'author': 'dcCreator.0',
			'img_preview': 'edmPreview.0'
		}
		$.getJSON(apiCall, function (json) {
			let data=savelines(json.items, mapdict, 'dcCreator.0', 'year.0');
			let metrolines=generateMetroLine(data);
			this.setState({metrolines: metrolines.lines});
			try{
				initTubeMap(metrolines);
			}
			catch{
				window.location.reload(true); 
			}
		}.bind(this));


		// Set-up the export button
		d3.select('#download').on('click', function(){
			let svg = d3.select("svg");
			let svgString = getSVGString(svg.node());
			let width = document.getElementById('tubeMap').offsetWidth;
			let height = document.getElementById('tubeMap').offsetHeight;
			
			svgString2Image( svgString, width*2, height, 'png', save ); 
			
			// passes Blob and filesize String to the callback
			function save( dataBlob, filesize ){
				saveAs( dataBlob, 'tubemap.png' ); // FileSaver.js function
			}
		});

    }

	closemodal(modal){
		$(modal).hide()
	}

	render() {
		return (
			<React.Fragment>
				<div id="tubeMap"></div>
				<div id="legenda">{
					this.state.metrolines.map(line=>
						<div 
						key={line.name}
						className="line">
							<div className="dot" style={{background: line.color}}></div>
							<div>{line.name}</div>
						</div>
					)
				}</div>
				<button
				id="download">
					download
				</button>
				<div id="modal">
					<div id="imageheader"></div>
					<h5 id="titlemodal">title</h5>
					<p id="modalparagraph">paragraph</p>
					<span 
					style={{fontSize:'15px'}, {color:'white'}}
					onClick={()=>this.closemodal('#modal')}
					>&#10006;</span>
				</div>
			</React.Fragment>
		);
	}
}

export default Tubemap;