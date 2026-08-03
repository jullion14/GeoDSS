using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly SpatialAnalysisService _analysis;
    public AnalysisController(SpatialAnalysisService analysis) => _analysis = analysis;

    [HttpGet("area/{id:int}")]
    public async Task<IActionResult> GetAreaMetrics(int id)
    {
        var metrics = await _analysis.GetForAreaAsync(id);
        return metrics is null ? NotFound() : Ok(metrics);
    }

    [HttpGet("areas")]
    public async Task<IActionResult> GetAllMetrics()
        => Ok(await _analysis.GetAllAsync());
}