import {PointStyle} from '../../models';

export class PointStyleApiAdapters {
  pointStyleAdapter(json: any): PointStyle {
    let pointStyle = {
      url: json.url,
      name: json.name,
      description: json.description,
      icon: json.icon,
      render_as_symbol: json.render_as_symbol,
      color: json.color,
      use_marker_pin: json.use_marker_pin,
      marker_color: json.marker_color,
      scale_factor: json.scale_factor,
      animation: json.animation,
      entity_types_styled: json.entity_types_styled,
      event_types_styled: json.event_types_styled
    };

    return pointStyle;
  }

}
