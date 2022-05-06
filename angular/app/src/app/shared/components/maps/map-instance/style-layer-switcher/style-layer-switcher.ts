/// Forked from https://github.com/el/style-switcher/lib/index.ts

import { IControl, Map as MapboxMap } from "maplibre-gl";
import { Subject } from 'rxjs';

export type MapboxStyleDefinition =
{
    title: string;
    uri;   // url for style, json style info or layer name
    type: string;
    default: boolean;
    id; // number for style, string for layer, string for marker
}

export class MapboxStyleLayerSwitcherControl implements IControl
{
    private static readonly DEFAULT_STYLE = "Streets";
    private static readonly DEFAULT_STYLES = [
        { title: "Dark", uri:"mapbox://styles/mapbox/dark-v9", type: "style", default: false, id: 1},
        { title: "Light", uri:"mapbox://styles/mapbox/light-v9", type: "style", default: false, id: 2},
        { title: "Outdoors", uri:"mapbox://styles/mapbox/outdoors-v10", type: "style", default: false, id: 3},
        { title: "Satellite", uri:"mapbox://styles/mapbox/satellite-streets-v10", type: "style", default: false, id: 4},
        { title: "Streets", uri:"mapbox://styles/mapbox/streets-v10", type: "style", default: true, id: 5}
    ];

    private controlContainer: HTMLElement | undefined;
    private map?: MapboxMap;
    private mapStyleContainer: HTMLElement | undefined;
    private styleButton: HTMLElement | undefined;
    private styles: MapboxStyleDefinition[];
    activeStyle;
    activeLayers: Set<any> = new Set();
    buttonClickSubject: Subject<string>;

    constructor(styles?: MapboxStyleDefinition[])
    {
        this.buttonClickSubject = new Subject();
        this.styles = styles || MapboxStyleLayerSwitcherControl.DEFAULT_STYLES;
        this.onDocumentClick = this.onDocumentClick.bind(this);
    }

    public getDefaultPosition(): string
    {
        const defaultPosition = "top-right";
        return defaultPosition;
    }

    public onAdd(map: MapboxMap): HTMLElement
    {
        this.map = map;
        this.controlContainer = document.createElement("div");
        this.controlContainer.classList.add("mapboxgl-ctrl");
        this.controlContainer.classList.add("mapboxgl-ctrl-group");
        this.mapStyleContainer = document.createElement("div");
        this.styleButton = document.createElement("button");
        this.mapStyleContainer.classList.add("mapboxgl-style-list");
        for (const style of this.styles)
        {
            const styleElement = document.createElement("button");
            styleElement.classList.add(style.title.replace(/[^a-z0-9-]/gi, '_'));

            if( style.type === "style") {
                styleElement.innerHTML = '&#x1F5FA; ' + style.title;
                styleElement.dataset.uri = JSON.stringify(style.uri);
                styleElement.addEventListener("click", event =>
                {
                    const srcElement = event.srcElement as HTMLButtonElement;
                    this.map!.setStyle(JSON.parse(srcElement.dataset.uri!));
                    this.mapStyleContainer!.style.display = "none";
                    this.styleButton!.style.display = "block";
                    const elms = this.mapStyleContainer!.getElementsByClassName("active");
                    while (elms[0])
                    {
                        elms[0].classList.remove("active");
                    }
                    srcElement.classList.add("active");
                    this.activeStyle = style.id;
                });
                if (style.default) {
                    styleElement.classList.add("active");
                    this.activeStyle = style.id;
                }
            } else if(style.type === "layer"){  
                styleElement.innerHTML = '&#x1F4CD; ' + style.title;
                styleElement.addEventListener("click", event =>
                {
                    let setVisible: boolean = false;
                    const srcElement = event.srcElement as HTMLButtonElement;
                    this.styleButton!.style.display = "block";
                    this.mapStyleContainer!.style.display = "none";
                    for(let layer of style.uri){
                        var visibility = this.map!.getLayoutProperty(layer, 'visibility');
                        if (visibility === 'none') {
                            map.setLayoutProperty(layer, 'visibility', 'visible');
                            setVisible = true;
                        } else {
                            map.setLayoutProperty(layer, 'visibility', 'none');
                            setVisible = false;
                        }
                    }

                    if(setVisible){
                        srcElement.classList.add("visible");
                        this.activeLayers.add(style.id);
                    } else {
                        srcElement.classList.remove("visible");
                        this.activeLayers.delete(style.id);
                    }
                });
                if (style.default) {
                    styleElement.classList.add("visible");
                    this.activeLayers.add(style.id);
                }
            } else { // marker
                styleElement.innerHTML = '&#x1F4CD; ' + style.title;
                styleElement.addEventListener("click", event =>
                {
                    this.buttonClickSubject.next(style.id);
                    this.styleButton!.style.display = "block";
                    this.mapStyleContainer!.style.display = "none";
                    const srcElement = event.srcElement as HTMLButtonElement;
                    if(srcElement.classList.contains("visible")){
                        srcElement.classList.remove("visible");;
                    } else {
                        srcElement.classList.add("visible");
                    }
                    
                });
                if (style.default) {
                    styleElement.classList.add("visible");
                }
            }
            this.mapStyleContainer.appendChild(styleElement);
        }
        this.styleButton.classList.add("mapboxgl-ctrl-icon");
        this.styleButton.classList.add("mapboxgl-style-switcher");
        this.styleButton.addEventListener("click", () =>
        {
            this.styleButton!.style.display = "none";
            this.mapStyleContainer!.style.display = "block";
        });

        document.addEventListener("click", this.onDocumentClick);

        this.controlContainer.appendChild(this.styleButton);
        this.controlContainer.appendChild(this.mapStyleContainer);
        return this.controlContainer;
    }

    public onRemove(): void
    {
        if (!this.controlContainer || !this.controlContainer.parentNode || !this.map || !this.styleButton)
        {
            return;
        }
        this.styleButton.removeEventListener("click", this.onDocumentClick);
        this.controlContainer.parentNode.removeChild(this.controlContainer);
        document.removeEventListener("click", this.onDocumentClick);
        this.map = undefined;
    }

    private onDocumentClick(event: MouseEvent): void
    {
        if (this.controlContainer && !this.controlContainer.contains(event.target as Element)
            && this.mapStyleContainer && this.styleButton)
        {
            this.mapStyleContainer.style.display = "none";
            this.styleButton.style.display = "block";
        }
    }
}