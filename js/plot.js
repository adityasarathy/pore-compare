// Variaables for DNA calculations
var d_dna = 2.2; // 2.2 nm diameter dsDNA
var d_dna_sq = Math.pow(d_dna, 2);
var sigma = 10.8; // KCl conductivity in nS/nm at 23 deg C
var pi = Math.PI;

function G_o(t, d) {
  d_sq = Math.pow(d, 2);
  denominator = 4. * t / (pi * d_sq) + 1. / d;
  return sigma / denominator;
}

function G_blocked(t, d) {
  if (d <= d_dna) {
    return 0;
  }
  d_sq = Math.pow(d, 2);
  d_eff_sq = d_sq - d_dna_sq;
  d_eff = Math.sqrt(d_eff_sq); // effective diameter of blocked pore
  denominator = 4. * t / (pi * d_eff_sq) + 1. / (d_eff);
  return sigma / denominator;
}

function Delta_G(t, d) {
  return G_o(t, d) - G_blocked(t, d);
}

/**
 * t = thickness in nm
 * start = diameter of pore you want to start the isoline at.
 * end = diameter of pore you want to end the isoline at.
 */
function generate_thickness_isoline(t, start, end) {
  data = [];

  var n = 10;
  var step = (end - start) / n;

  for (i = 0; i < n; i++) {
    x = start + i * step;
    new_point = [G_o(t, x), Delta_G(t, x)];
    data.push(new_point);
  }
  return data;
}

var t_0nm_data = generate_thickness_isoline(0, 2.5, 4.167);
var t_1nm_data = generate_thickness_isoline(1, d_dna, 5.636); // DeltaG = 45 nS for t = 1nm and d = 5.19 nm
var t_2nm_data = generate_thickness_isoline(2, d_dna, 5.950);

var bibtex;

function get_nature_format(citation) {
  var tags = citation.entryTags;
  var authors = tags.author.split(' and ');
  var author = authors[0]; // get first author
  if (authors.length > 1) {
    author += " <i>et al</i>"
  }
  var result = '<li>';
  result += '<a id="bib-' + citation.citationKey + '"></a>';
  result += author + '.';
  result += ' ' + tags.title + '.';
  result += ' <i>' + tags.journal + '</i>';
  result += ' <b>' + tags.volume + '</b>,';
  result += ' ' + tags.pages;
  result += ' (' + tags.year + ').'
  if (tags.hasOwnProperty('url')) {
    result += ' <a href="' + tags.url + '">(Link)</a>';
  }
  result += '</li>'
  return result;
}

function get_author_from_key(key) {
  var citation = bibtex[key];
  var authors = citation.entryTags.author.split(' and ');
  var author = authors[0]; // get first author
  if (authors.length > 1) {
    author += " <i>et al.</i>"
  }
  return author;
}

function get_formatted_citation_from_key(key) {
  var citation = bibtex[key];
  return get_nature_format(citation);
}

function get_citation_html(key) {
  return '<sup class="bib-' + key + '"></sup>';
}

/**
Sample row declaration
var t = {
      'bib': series[i].bib,
      'name': get_author_from_key(series[i].bib),
      'material': series[i].material,
      'dna': series[i].dna,
      'electrolyte_concentration': series[i].electrolyte_concentration,
      'electrolyte': series[i].electrolyte,
      'sigma': series[i].sigma,
      'deltaG': series[i].data[0][1]
    };
**/
function format_table_row_array(t) {
  var result = [];
  t.hasOwnProperty('bib') ? result.push(t.bib) : result.push('');
  t.hasOwnProperty('name') ? result.push(t.name) : result.push('');
  t.hasOwnProperty('material') ? result.push(t.material) : result.push('');
  t.hasOwnProperty('dna') ? result.push(t.dna) : result.push('');
  t.hasOwnProperty('electrolyte_concentration') ? result.push(t.electrolyte_concentration) : result.push('');
  t.hasOwnProperty('electrolyte') ? result.push(t.electrolyte) : result.push('');
  t.hasOwnProperty('sigma') ? result.push(t.sigma) : result.push('');
  t.hasOwnProperty('deltaG') ? result.push(t.deltaG) : result.push('');
  return result;

}

function add_point_to_chart(name, g_o, deltaG) {
  var series = {
    type: 'scatter',
    name: name,
    data: [
      [g_o, deltaG]
    ]
  };
  var chart = $('#ds-plot').highcharts();
  chart.addSeries(series);
}

function add_point_to_table(name, deltaG) {
  var table = $('#ds-table').DataTable();
  var row = format_table_row_array({
    'name': name,
    'deltaG': deltaG
  });
  table.row.add(row).draw();
}

function add_point_to_chart_and_table(name, g_o, deltaG) {
  add_point_to_chart(name, g_o, deltaG);
  add_point_to_table(name, deltaG);
}

// Refreshes the <sup class="bib-*"></sup> with the correct citations.
function refresh_bib() {
  if (bibtex == null) {
    return
  }
  // empty the references ordered list
  $('#references').empty()

  var cited = [];
  var count = 0;
  var citations = $('[class^=bib-]').each(function(i) {
    var citation = $(this);
    citation.empty();
    var key = citation[0].className.replace("bib-", "");
    var index = cited.indexOf(key);
    if (index < 0) {
      count++;
      citation.append('<a href="#bib-' + key + '">' + count + '</a>');
      cited.push(key);
      // We also add this to the references list
      $('#references').append(get_formatted_citation_from_key(key));
    } else {
      citation.append('<a href="#bib-' + key + '">' + (index + 1) + '</a>');
    }
  });
}

function plotChartAndTable(series) {

  // Set the highcharts plot options
  var options = {
    plotOptions: {
      scatter: {
        marker: {
          radius: 9
        }
      }
    },
    title: {
      text: 'dsDNA Conductance Comparison',
      x: -20 //center
    },
    xAxis: {
      title: {
        text: 'Go (nS)'
      }
    },
    yAxis: {
      title: {
        text: 'ΔG (nS)',
        useHTML: true
      },
    },
    tooltip: {
      useHTML: true,
      formatter: function() {
        var name;
        if (this.series.options.hasOwnProperty('bib')) {
          name = get_author_from_key(this.series.options.bib);
        } else {
          name = this.series.name;
        }
        return name +
          '<br/>Go: ' + this.x + ' nS' +
          '<br/>ΔG: ' + this.y + ' nS';
      }
    },
    legend: {
      layout: 'horizontal',
      align: 'left',
      verticalAlign: 'bottom',
      itemMarginTop: 8,
      itemMarginBottom: 8,
      padding: 3,
      borderWidth: 0,
      labelFormatter: function() {
        if (this.options.hasOwnProperty('bib')) {
          return get_author_from_key(this.options.bib) + get_citation_html(this.options.bib);
        } else {
          return this.name;
        }
      },
      useHTML: true
    },
    series: [{
      type: 'spline',
      name: 'ΔG = Go',
      color: '#000000',
      lineWidth: 2,
      dashStyle: 'dash',
      marker: {
        enabled: false
      },
      enableMouseTracking: false,
      data: [
        [2, 2],
        [15, 15],
      ]
    }, {
      type: 'spline',
      lineWidth: 1,
      color: '#555555',
      dashStyle: 'dot',
      name: 't = 0 nm',
      marker: {
        enabled: false
      },
      enableMouseTracking: false,
      data: t_0nm_data
    }, {
      type: 'spline',
      name: 't = 1 nm',
      lineWidth: 1,
      color: '#555555',
      dashStyle: 'dash',
      marker: {
        enabled: false
      },
      enableMouseTracking: false,
      data: t_1nm_data
    }, {
      type: 'spline',
      lineWidth: 1,
      color: '#555555',
      dashStyle: 'longdash',
      name: 't = 2 nm',
      marker: {
        enabled: false
      },
      enableMouseTracking: false,
      data: t_2nm_data
    }]
  };

  var tableStuff = [];
  var temp;

  // Format the highcharts options as well as the dataTables data
  for (var i = 0; i < series.length; i++) {
    temp = series[i];
    temp.type = 'scatter';
    options.series.push(temp);

    var t = {
      'bib': series[i].bib,
      'name': get_author_from_key(series[i].bib),
      'material': series[i].material,
      'dna': series[i].dna,
      'electrolyte_concentration': series[i].electrolyte_concentration,
      'electrolyte': series[i].electrolyte,
      'sigma': series[i].sigma,
      'deltaG': series[i].data[0][1]
    };
    tableStuff.push(format_table_row_array(t));
  }

  // Plot the highcharts chart
  $('#ds-plot').highcharts(options);

  // Add the datatable
  var ds_table = $('#ds-table').dataTable({
    "scrollX": true,
    "data": tableStuff,
    "order": [
      [7, "desc"]
    ],
    "columns": [{
      "title": "Cite",
      "visible": false
    }, {
      "title": "Publication",
      // linkify if the link is available
      "render": function(data, type, row) {
        var ret = '';
        if (row[0].length > 0) {
          ret += get_citation_html(row[0]);
        }
        return data + ret;
      },
    }, {
      "title": "Material"
    }, {
      "title": "dsDNA (bp)",
      "className": "dt-body-right",
      "render": function(data, type, row) {
        if (type == "display" && data > 1000) {
          return (data / 1000) + ' k';
        }
        return data;
      }
    }, {
      "title": "Electrolyte",
      "className": "dt-body-right",
      "render": function(data, type, row) {
        if (type == "display") {
          return data + ' M ' + row[5];
        }
        return data;
      }
    }, {
      "title": "Electrolyte Name",
      "visible": false
    }, {
      "title": "σ (S/m)",
      "className": "dt-body-right"
    }, {
      "title": "ΔG (nS) scaled to <br/>1&nbsp;M&nbsp;KCl @ 23&nbsp;&deg;C (10.8 S/m)",
      "className": "dt-body-right"
    }]
  });

  // For some reason, need this hack to redraw table after 10 ms so the header
  // and body of table are aligned properly.
  setTimeout(function() {
    ds_table.fnAdjustColumnSizing();
  }, 10);

}
$(document).ready(function() {
  // Grab the json data
  var d1 = $.getJSON('data/data.json');

  // Load the bibliography
  var d2 = $.ajax({
    url: "assets/bib.bib",
    dataType: "text"
  });

  // Wait until both the bibliography text and json data are loaded.
  $.when(d1, d2).then(function(result1, result2) {

    // parse the bibtex
    var rawBib = result2[0];
    var bib = bibtexParse.toJSON(rawBib);
    // convert the bibtex array to a key/value object
    bibtex = {};
    for (var i = 0; i < bib.length; i++) {
      bibtex[bib[i].citationKey] = bib[i];
    }

    var series = result1[0];
    plotChartAndTable(series);
    refresh_bib();

  });

  // Set up the add a point form
  $('#form-add-point-submit').click(function() {
    var $form = $('#form-add-point');
    if ($form.parsley().validate()) {
      var name = $('#form-name').val();
      var g_o = Number($('#form-Go').val());
      var deltaG = Number($('#form-DeltaG').val());
      add_point_to_chart_and_table(name, g_o, deltaG);
    }
  });
});
