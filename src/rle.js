export function decodeRle(string) {
  var cells = []
  var ignore = false
  var step = 1
  var x = 0
  var y = 0
  var match, number
  for (var i = 0; i < string.length; i++) {
    if (ignore) {
      if (string[i] === "\n") {
        ignore = false
      }
      continue
    }
    switch (string[i]) {
      case "#":
      case "x":
      case "!":
        ignore = true
        continue
      case "$":
        x = 0
        y += step
        continue
      case "b":
        x += step
        step = 1
        continue
      case "o":
        for (var j = 0; j < step; j++) {
          cells.push(x++, y)
        }
        step = 1
        continue
    }
    match = string.slice(i).match(/[0-9]+/)
    if (match && !match.index) {
      number = match[0]
      step = parseInt(number)
      i += number.length - 1
    }
  }
  return cells
}