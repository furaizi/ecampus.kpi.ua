'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading6 } from '@/components/typography';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { dash } from 'radash';
import { getTerm } from '@/actions/term.actions';
import { getMonitoring } from '@/actions/monitoring.actions';
import { Term, TermDiscipline } from '@/types/models/term';
import { Semester } from '@/types/enums/current-control/semester';
import { useLocalStorage } from '@/hooks/use-storage';
import { useServerErrorToast } from '@/hooks/use-server-error-toast';
import SpinnerGap from '@/app/images/icons/SpinnerGap.svg';
import { round } from '@/lib/utils';
import { SessionFilters } from './session-filters';
import { TermStatusBadge } from './term-status-badge';
import { ProfilePicture } from '@/components/ui/profile-picture';

const MAX_SCORE = 100;

export function Session() {
  const t = useTranslations('private.vedomoststud');
  const tEnums = useTranslations('global.enums');

  const [term, setTerm] = useState<Term | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { errorToast } = useServerErrorToast();

  const fetchData = useCallback(async () => {
    try {
      const [termData, monitoring] = await Promise.all([getTerm(), getMonitoring()]);

      const normalize = (str: string) => str.toLowerCase().replace(/[\s.,]+/g, '');

      const disciplineMap = new Map<string, (typeof monitoring.disciplines)[number]>();
      monitoring.disciplines.forEach((m) => {
        const base = normalize(m.name);
        const lecturer = m.lecturers[0]?.fullName ? normalize(m.lecturers[0].fullName) : '';
        disciplineMap.set(`${base}_${lecturer}`, m);
        disciplineMap.set(base, m);
      });

      const disciplines = termData.disciplines.map((d) => {
        const base = normalize(d.name);
        const lecturer = d.lecturer?.fullName ? normalize(d.lecturer.fullName) : '';
        const match = disciplineMap.get(`${base}_${lecturer}`) || disciplineMap.get(base);

        return {
          ...d,
          studyYear: match?.studyYear ?? defaultYear,
          semester: match?.semester ?? Semester.First,
        };
      });

      setTerm({ ...termData, studyYears: monitoring.studyYears, disciplines });
    } catch (error) {
      errorToast();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const disciplines: TermDiscipline[] = term?.disciplines ?? [];

  const studyYears = useMemo(() => {
    if (term?.studyYears?.length) {
      return term.studyYears;
    }
    const years = new Set<string>();
    disciplines.forEach((d) => {
      if ((d as any).studyYear) {
        years.add((d as any).studyYear as string);
      }
    });
    return Array.from(years);
  }, [term?.studyYears, disciplines]);

  const currentYear = studyYears.at(-1) || '';

  const [selectedStudyYear, setSelectedStudyYear] = useLocalStorage<string>('termStudyYear');
  const [selectedSemester = Semester.All, setSelectedSemester] = useLocalStorage<Semester>('termSemester');

  useEffect(() => {
    if (!selectedStudyYear && currentYear) {
      setSelectedStudyYear(currentYear);
    }
  }, [currentYear, selectedStudyYear, setSelectedStudyYear]);

  const filteredDisciplines = useMemo(() => {
    return disciplines.filter((d) => {
      const matchesYear = !selectedStudyYear || (d as any).studyYear === selectedStudyYear;
      const matchesSemester =
        selectedSemester === Semester.All || String((d as any).semester ?? '') === selectedSemester;
      return matchesYear && matchesSemester;
    });
  }, [disciplines, selectedSemester, selectedStudyYear]);

  const averageScore = useMemo(() => {
    const marks = filteredDisciplines.map((d) => d.mark).filter((m): m is number => m !== undefined);
    if (!marks.length) return 0;
    const total = marks.reduce((acc, m) => acc + m, 0);
    return round(total / marks.length, 2);
  }, [filteredDisciplines]);

  const LecturerItem = ({ photo, fullName }: { photo: string; fullName: string }) => (
    <div className="flex items-center gap-3">
      <ProfilePicture size="xs" src={photo} />
      <span className="text-sm font-semibold text-basic-black">{fullName}</span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <SpinnerGap />
      </div>
    );
  }

  return (
    <Card className="rounded-b-6 col-span-full w-full bg-white p-6 xl:col-span-5">
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center">
        <Heading6 className="mr-auto text-neutral-900">{t('your-information')}</Heading6>
        <SessionFilters
          studyYears={studyYears}
          currentYear={currentYear}
          selectedSemester={selectedSemester}
          selectedStudyYear={selectedStudyYear}
          onStudyYearSelect={setSelectedStudyYear}
          onSemesterSelect={setSelectedSemester}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('date')}</TableHead>
            <TableHead>{t('subject')}</TableHead>
            <TableHead className="text-center">{t('score')}</TableHead>
            <TableHead>{t('controlType')}</TableHead>
            <TableHead>{t('sessionType')}</TableHead>
            <TableHead>{t('lecturer')}</TableHead>
            <TableHead>{t('status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDisciplines.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="w-[120px]">{row.date}</TableCell>
              <TableCell className="w-[300px]">{row.name}</TableCell>
              <TableCell className="w-[109px] text-center">
                {row.mark !== undefined && (
                  <Badge className="font-semibold text-basic-blue">
                    {Number(row.mark)}/{MAX_SCORE}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="w-[140px]">{tEnums(`assessment-type.${dash(row.assessmentType)}`)}</TableCell>
              <TableCell className="w-[140px]">{tEnums(`record-type.${dash(row.recordType)}`)}</TableCell>
              <TableCell className="max-w-[158px]">
                {row.lecturer && <LecturerItem photo={row.lecturer.photo} fullName={row.lecturer.fullName} />}
              </TableCell>
              <TableCell className="w-[140px]">
                <TermStatusBadge className="flex justify-center border text-center font-semibold" status={row.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="my-2 flex items-center gap-2 whitespace-nowrap pl-4">
        <p className="text-base font-normal">{t('average-score')}</p>
        <Badge className="bg-basic-blue font-semibold text-basic-white">{averageScore}</Badge>
      </div>
    </Card>
  );
}
