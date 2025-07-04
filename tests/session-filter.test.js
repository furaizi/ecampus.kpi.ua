import assert from 'node:assert';
import test from 'node:test';

function filterDisciplines(disciplines, year, semester) {
  return disciplines.filter((d) => {
    const matchesYear = !year || d.studyYear === year;
    const matchesSemester = semester === 'all' || String(d.semester ?? '') === semester;
    return matchesYear && matchesSemester;
  });
}

test('all subjects remain when filtering by year', () => {
  const disciplines = [
    { name: 'Math', studyYear: '2023-2024', semester: 1 },
    { name: 'Physics', studyYear: '2023-2024', semester: 2 },
  ];
  const result = filterDisciplines(disciplines, '2023-2024', 'all');
  assert.strictEqual(result.length, disciplines.length);
});

