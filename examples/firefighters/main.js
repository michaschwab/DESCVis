var svg = d3.select('svg');
var width = 1000;
var height = 600;
var fallingObjects = [];
svg.attr('width', width)
    .attr('height', height);
svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#ccc');
var net = svg.append('line').attr('stroke', '#000000');
var collaboratorIds = new Set();
var started = false;
svg.on('mousemove', function () {
    var index = getCollaboratorIndex(d3.event.collaboratorId);
    net.attr('x' + String(index), d3.event.x);
    net.attr('y' + String(index), d3.event.y);
    if (!started) {
        started = true;
        raf();
    }
});
var addRandomFallingObject = function () {
    fallingObjects.push({
        id: String(random()),
        type: random() > 0.5 ? 'rock' : 'person',
        position: { x: random() * width, y: -100 },
        speed: 0.1 + random() * 0.2
    });
};
var lastFrame = Date.now();
var rockPath = 'm 20,135 20,-10 60,10 30,-10 10,20 -20,25 -60,10 z';
var personPath = 'm 42,165 c 0,0 -10,6 -12,-3 -1,-8 14,-6 20,-4 5,1 8,-2 24,-3 15,-0 66,-6 66,-6 0,0 12,0 1,6 -13,2 -28,3 -28,3 l 27,1 c 0,0 18,3 0,5 -17,-0 -44,-0 -44,-0 l -21,1 -19,0 c 0,0 -15,20 -19,22 -4,2 -8,0 -2,-6 6,-7 10,-11 10,-11 l -19,7 c 0,0 -11,1 -3,-4 10,-2 20,-8 20,-8 z';
var raf = function () {
    if (random() > 0.9) {
        addRandomFallingObject();
    }
    fallingObjects.forEach(function (falling) { return falling.position.y += falling.speed * (Date.now() - lastFrame); });
    fallingObjects = fallingObjects.filter(function (falling) { return falling.position.y < height; });
    var falling = svg.selectAll('.falling').data(fallingObjects, function (d) { return d.id; });
    falling.exit().remove();
    var fallingEnter = falling.enter()
        .append('g')
        .attr('class', 'falling');
    fallingEnter.append('path')
        .attr('d', function (d) { return d.type === 'rock' ? rockPath : personPath; })
        .attr('fill', function (d) { return d.type === 'rock' ? '#666' : '#0c0'; });
    fallingEnter.merge(falling).attr('transform', function (d) { return "translate(" + d.position.x + ", " + d.position.y + ")scale(0.5)"; });
    lastFrame = Date.now();
    requestAnimationFrame(raf);
};
var getCollaboratorIndex = function (id) {
    if (!id) {
        return;
    }
    if (!collaboratorIds.has(id)) {
        collaboratorIds.add(id);
    }
    return Array.from(collaboratorIds.values()).indexOf(id) + 1; // 1 or 2
};
var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
//# sourceMappingURL=main.js.map