declare const Qualtrics: any;

interface Map {
  css?: string;
  options: google.maps.MapOptions;
  marker: {
    autocomplete?: {
      enabled: boolean;
      label: string;
      css?: string;
      labelCss?: string;
      invalidLocationAlertText: string;
    },
    options: google.maps.MarkerOptions;
  };
}

interface Question {
  id: string;
  container: Element;
  map: Map;
}

const IMPORTANT_TYPES: string[] = [
  'tourist_attraction',
  'museum',
  'night_club',
  'bar',
  'food',
  'park',
  'restaurant'
]

const initGoogleMapsQuestion = (
  id: Question['id'],
  container: Question['container'],
  map: Question['map'],
): void | Error => {
  // Find the dataBox and hide it
  const dataBox = document.getElementById(`QR~${id}`) as HTMLInputElement | null;
  if (!dataBox) {
    return new Error(`Could not find input for question with id ${id}.`);
  }
  dataBox.style.display = 'none';

  // Find the QuestionBody to append to
  const questionBody = container.querySelector('.QuestionBody') || container;

  // Initialize data storage or load from existing data in field
  const value: { [key: number]: google.maps.LatLng } = dataBox.value !== '' ? JSON.parse(dataBox.value) : {};

  const styles = document.createElement('style');
  document.head.appendChild(styles);

  // Create the map node
  const mapObject = document.createElement('div');
  mapObject.setAttribute('id', `${id}-map`);
  if (map.css) {
    styles.innerText += `#${id}-map {${map.css}}`;
    mapObject.setAttribute('style', map.css);
  } else {
    styles.innerText += `#${id}-map {height: 300px;}`;
  }
  questionBody.appendChild(mapObject);

  // Initialize the Google Map
  const googleMap = new google.maps.Map(mapObject, map.options);

  // Initialize the Marker without a location at first
  const mapMarker = new google.maps.Marker({
    ...map.marker.options,
    map: googleMap,
  });

  if (map.marker.autocomplete?.enabled) {
    const inputId = `${id}-locationInput`;

    // Make the label for the autocomplete
    const locationLabel = document.createElement('label');
    locationLabel.setAttribute('for', inputId);
    locationLabel.setAttribute('id', `${inputId}-label`);
    locationLabel.setAttribute('class', 'QuestionText');
    if (map.marker.autocomplete.labelCss) {
      styles.innerText += `#${inputId}-label {${map.marker.autocomplete.labelCss}}`;
    }
    locationLabel.innerText = map.marker.autocomplete.label || map.marker.options.title || `Marker ${map.marker.options.label}`;
    questionBody.appendChild(locationLabel);

    // Make the autocomplete
    const locationInput = document.createElement('input');
    locationInput.setAttribute('id', inputId);
    locationInput.setAttribute('class', 'InputText');
    if (map.marker.autocomplete.css) {
      styles.innerText += `#${id}-locationInput {${map.marker.autocomplete.css}}`;
    }
    questionBody.appendChild(locationInput);

    // Load the places API
    const locationAutocomplete = new google.maps.places.Autocomplete(locationInput);

    // Whenever the inputs change, set the locationLatLong and pan the map to the location
    google.maps.event.addListener(locationAutocomplete, 'place_changed', () => {
      const place = locationAutocomplete.getPlace();

      // set all to null in case two places are loaded. want to make sure we only have the info of the most recent place
      Qualtrics.SurveyEngine.setEmbeddedData('G_ADDRESS', undefined);
      Qualtrics.SurveyEngine.setEmbeddedData('G_NAME', undefined);
      Qualtrics.SurveyEngine.setEmbeddedData('G_PLACE_ID', undefined);
      Qualtrics.SurveyEngine.setEmbeddedData('G_PRICE', undefined);
      Qualtrics.SurveyEngine.setEmbeddedData('G_RATING', undefined);
      Qualtrics.SurveyEngine.setEmbeddedData('G_MAIN_TYPE', undefined);
      Qualtrics.SurveyEngine.setEmbeddedData('G_NEIGHBORHOOD', undefined);

      // now set to new values
      Qualtrics.SurveyEngine.setEmbeddedData('G_ADDRESS', place.formatted_address);
      Qualtrics.SurveyEngine.setEmbeddedData('G_NAME', place.name);
      Qualtrics.SurveyEngine.setEmbeddedData('G_PLACE_ID', place.place_id);
      Qualtrics.SurveyEngine.setEmbeddedData('G_PRICE', place.price_level);
      Qualtrics.SurveyEngine.setEmbeddedData('G_RATING', place.rating);

      // google lists the most important "type" first, so go in order of the array
      if (place.types) {
        for (const type of place.types) {
          if (IMPORTANT_TYPES.indexOf(type) > -1) {
            Qualtrics.SurveyEngine.setEmbeddedData('G_MAIN_TYPE', type);
            break;
          }
        }
      }

      const neighborhood: google.maps.GeocoderAddressComponent[] | undefined = place.address_components?.filter((component: google.maps.GeocoderAddressComponent) => {
        return component.types.some((type: string) => type === 'neighborhood');
      });
      if (neighborhood && neighborhood?.length > 0) {
        Qualtrics.SurveyEngine.setEmbeddedData('G_NEIGHBORHOOD', neighborhood[0].long_name);
      }

      if (place.geometry) {
        mapMarker.setPosition(place.geometry.location);
        googleMap.panTo(place.geometry.location);
        googleMap.setZoom(16);
      } else {
        alert(map.marker.autocomplete?.invalidLocationAlertText || 'Invalid Location');
      }
    });
  }
};

// Typescript doesn't allow augmentation of the global scope except in modules, but we need to expose this to the global scope
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.initGoogleMapsQuestion = initGoogleMapsQuestion;
